"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Users, Clock, Euro, Calculator, Filter, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface CompanyBillingData {
	id: string
	name: string
	email: string
	phone: string
	address: string
	usersCount: number
	serviceLevelsCount: number
	workEntriesCount: number
	totalWorkMinutes: number
	totalWorkAmount: number
	addOnsCount: number
	totalAddOnAmount: number
	totalUnbilledAmount: number
	hasUnbilledItems: boolean
	serviceLevels: Array<{
		id: string
		name: string
		remainingMinutes: number
		totalTimeVolumeMinutes: number
	}>
	customOptions: Array<{
		id: string
		name: string
		description: string
		monthlyPrice: number
		activatedAt: Date
		deactivatedAt: Date | null
	}>
}

interface OverallTotals {
	companiesWithUnbilled: number
	totalWorkMinutes: number
	totalWorkAmount: number
	totalAddOnAmount: number
	totalUnbilledAmount: number
}

export default function CompanyBillingOverviewPage() {
	const router = useRouter()
	const [companies, setCompanies] = useState<CompanyBillingData[]>([])
	const [overallTotals, setOverallTotals] = useState<OverallTotals | null>(null)
	const [filteredCompanies, setFilteredCompanies] = useState<CompanyBillingData[]>([])
	const [searchTerm, setSearchTerm] = useState("")
	const [amountFilter, setAmountFilter] = useState("all")
	const [loading, setLoading] = useState(true)
	const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
	const [year, setYear] = useState(new Date().getFullYear().toString())

	useEffect(() => {
		loadCompanies()
	}, [month, year])

	useEffect(() => {
		// Filter companies
		let filtered = companies

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(company => 
				company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				company.email.toLowerCase().includes(searchTerm.toLowerCase())
			)
		}

		// Amount filter
		if (amountFilter && amountFilter !== "all") {
			switch (amountFilter) {
				case "low":
					filtered = filtered.filter(company => company.totalUnbilledAmount < 100)
					break
				case "medium":
					filtered = filtered.filter(company => company.totalUnbilledAmount >= 100 && company.totalUnbilledAmount < 500)
					break
				case "high":
					filtered = filtered.filter(company => company.totalUnbilledAmount >= 500)
					break
			}
		}

		setFilteredCompanies(filtered)
	}, [companies, searchTerm, amountFilter])

	async function loadCompanies() {
		try {
			setLoading(true)
			console.log("Loading companies...")
			
			const response = await fetch(`/api/billing/companies?month=${month}&year=${year}`)
			console.log("Response status:", response.status)
			console.log("Response ok:", response.ok)
			
			if (!response.ok) {
				const errorText = await response.text()
				console.error("API Error:", errorText)
				throw new Error(`Failed to fetch companies: ${response.status} ${errorText}`)
			}
			
			const data = await response.json()
			console.log("API Response:", data)
			
			setCompanies(data.companies)
			setOverallTotals(data.overallTotals)
		} catch (error) {
			console.error("Error loading companies:", error)
		} finally {
			setLoading(false)
		}
	}

	const handleCompanyClick = (companyId: string) => {
		// Navigate to billing page with company pre-selected
		router.push(`/admin/billing?company=${companyId}&month=${month}&year=${year}`)
	}

	function getAmountBadge(amount: number) {
		if (amount >= 500) return <Badge variant="destructive">Hoch (≥500€)</Badge>
		if (amount >= 100) return <Badge variant="secondary">Mittel (100-499€)</Badge>
		return <Badge variant="outline">Niedrig (&lt;100€)</Badge>
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat("de-DE", {
			style: "currency",
			currency: "EUR"
		}).format(amount)
	}

	function formatMinutes(minutes: number) {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours}h ${mins}m`
	}

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-6 rounded-xl">
				<h1 className="text-h1 text-orange-900 flex items-center gap-2">
					<Euro className="h-8 w-8" />
					Firmen-Abrechnungsübersicht
				</h1>
				<p className="text-orange-700 mt-2">
					Übersicht über Firmen mit offenen Abrechnungen
				</p>
			</div>

			{/* Overall Statistics */}
			{overallTotals && (
				<Card className="bg-white border-gray-200 shadow-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calculator className="h-5 w-5 text-orange-600" />
							Gesamtübersicht
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="text-center p-4 bg-blue-50 rounded-lg">
								<div className="text-2xl font-bold text-blue-600">{overallTotals.companiesWithUnbilled}</div>
								<div className="text-sm text-blue-700">Firmen mit offenen Abrechnungen</div>
							</div>
							<div className="text-center p-4 bg-green-50 rounded-lg">
								<div className="text-2xl font-bold text-green-600">{formatMinutes(overallTotals.totalWorkMinutes)}</div>
								<div className="text-sm text-green-700">Offene Arbeitszeit</div>
							</div>
							<div className="text-center p-4 bg-purple-50 rounded-lg">
								<div className="text-2xl font-bold text-purple-600">{formatCurrency(overallTotals.totalWorkAmount)}</div>
								<div className="text-sm text-purple-700">Offene Arbeitskosten</div>
							</div>
							<div className="text-center p-4 bg-orange-50 rounded-lg">
								<div className="text-2xl font-bold text-orange-600">{formatCurrency(overallTotals.totalUnbilledAmount)}</div>
								<div className="text-sm text-orange-700">Gesamt offene Abrechnung</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Filters */}
			<Card className="bg-white border-gray-200 shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filter & Suche
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div>
							<Label htmlFor="search">Suche</Label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									id="search"
									placeholder="Firma oder E-Mail suchen..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="amount">Betrag</Label>
							<Select value={amountFilter} onValueChange={setAmountFilter}>
								<SelectTrigger>
									<SelectValue placeholder="Alle Beträge" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Alle Beträge</SelectItem>
									<SelectItem value="low">Niedrig (&lt;100€)</SelectItem>
									<SelectItem value="medium">Mittel (100-499€)</SelectItem>
									<SelectItem value="high">Hoch (≥500€)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="month">Monat</Label>
							<Select value={month} onValueChange={setMonth}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: 12 }, (_, i) => (
										<SelectItem key={i + 1} value={(i + 1).toString()}>
											{new Date(0, i).toLocaleDateString("de-DE", { month: "long" })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="year">Jahr</Label>
							<Select value={year} onValueChange={setYear}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: 5 }, (_, i) => {
										const year = new Date().getFullYear() - 2 + i
										return (
											<SelectItem key={year} value={year.toString()}>
												{year}
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Companies List */}
			<Card className="bg-white border-gray-200 shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Firmen mit offenen Abrechnungen ({filteredCompanies.length})
					</CardTitle>
					<CardDescription>
						Übersicht über alle Firmen mit unverrechneten Aufwänden
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							<div className="animate-pulse">
								<div className="h-20 bg-gray-200 rounded-lg"></div>
								<div className="h-20 bg-gray-200 rounded-lg"></div>
								<div className="h-20 bg-gray-200 rounded-lg"></div>
							</div>
						</div>
					) : filteredCompanies.length === 0 ? (
						<div className="text-center py-8">
							<div className="text-gray-500 text-lg mb-2">🎉</div>
							<p className="text-gray-500">Keine Firmen mit offenen Abrechnungen</p>
							<p className="text-sm text-gray-400 mt-1">
								Alle Abrechnungen sind aktuell oder es wurden keine gefunden
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredCompanies.map((company) => (
								<div 
									key={company.id} 
									className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
									onClick={() => handleCompanyClick(company.id)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<h3 className="font-medium text-gray-900">{company.name}</h3>
												{getAmountBadge(company.totalUnbilledAmount)}
											</div>
											<div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
												<span className="flex items-center gap-1">
													<Users className="h-4 w-4" />
													{company.usersCount} Benutzer
												</span>
												<span className="flex items-center gap-1">
													<Clock className="h-4 w-4" />
													{company.workEntriesCount} Aufwände
												</span>
												<span className="flex items-center gap-1">
													<Euro className="h-4 w-4" />
													{formatCurrency(company.totalUnbilledAmount)}
												</span>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
												<div>
													<div className="font-medium text-gray-700 mb-1">Arbeitsaufwände:</div>
													<div className="text-gray-600">
														{formatMinutes(company.totalWorkMinutes)} • {formatCurrency(company.totalWorkAmount)}
													</div>
												</div>
												<div>
													<div className="font-medium text-gray-700 mb-1">Add-ons:</div>
													<div className="text-gray-600">
														{company.addOnsCount} Optionen • {formatCurrency(company.totalAddOnAmount)}
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
