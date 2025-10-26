import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
	try {
		// Check authentication
		const session = await getServerSession(authOptions)
		if (!session || session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const month = parseInt(searchParams.get('month') || '1')
		const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

		// Get all companies with their data
		const companies = await prisma.company.findMany({
			include: {
				users: true,
				serviceLevel: true,
				tickets: {
					include: {
						workEntries: {
							where: {
								isBilled: false,
								createdAt: {
									gte: new Date(year, month - 1, 1),
									lt: new Date(year, month, 1)
								}
							}
						}
					}
				},
				customOptions: {
					where: {
						isBilled: false,
						activatedAt: {
							lte: new Date(year, month, 1)
						},
						OR: [
							{ deactivatedAt: null },
							{ deactivatedAt: { gte: new Date(year, month - 1, 1) } }
						]
					},
					include: {
						customOption: true
					}
				}
			}
		})

		// Process companies data
		const processedCompanies = companies.map(company => {
			// Flatten work entries from all tickets
			const allWorkEntries = company.tickets.flatMap(ticket => ticket.workEntries)
			
			const totalWorkMinutes = allWorkEntries.reduce((sum, entry) => sum + entry.roundedMinutes, 0)
			const totalWorkAmount = allWorkEntries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)
			const totalAddOnAmount = company.customOptions.reduce((sum, option) => sum + option.customOption.price, 0)
			const totalUnbilledAmount = totalWorkAmount + totalAddOnAmount

			return {
				id: company.id,
				name: company.name,
				email: company.email,
				phone: company.phone,
				address: company.address,
				usersCount: company.users.length,
				serviceLevelsCount: company.serviceLevel ? 1 : 0,
				workEntriesCount: allWorkEntries.length,
				totalWorkMinutes,
				totalWorkAmount,
				addOnsCount: company.customOptions.length,
				totalAddOnAmount,
				totalUnbilledAmount,
				hasUnbilledItems: totalUnbilledAmount > 0,
				serviceLevels: company.serviceLevel ? [company.serviceLevel] : [],
				customOptions: company.customOptions
			}
		})

		// Calculate overall totals
		const overallTotals = {
			companiesWithUnbilled: processedCompanies.filter(c => c.hasUnbilledItems).length,
			totalWorkMinutes: processedCompanies.reduce((sum, c) => sum + c.totalWorkMinutes, 0),
			totalWorkAmount: processedCompanies.reduce((sum, c) => sum + c.totalWorkAmount, 0),
			totalAddOnAmount: processedCompanies.reduce((sum, c) => sum + c.totalAddOnAmount, 0),
			totalUnbilledAmount: processedCompanies.reduce((sum, c) => sum + c.totalUnbilledAmount, 0)
		}

		return NextResponse.json({
			companies: processedCompanies,
			overallTotals
		})

	} catch (error) {
		console.error("Error fetching billing companies:", error)
		return NextResponse.json({ 
			error: "Internal Server Error"
		}, { status: 500 })
	}
}