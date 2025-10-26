import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, templateName, variables } = await request.json()

    if (!to || !templateName) {
      return NextResponse.json({ 
        error: 'E-Mail-Adresse und Template-Name sind erforderlich' 
      }, { status: 400 })
    }

    const result = await sendTemplateEmail({
      templateName,
      to,
      variables: variables || {}
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'E-Mail erfolgreich gesendet',
        messageId: result.messageId 
      })
    } else {
      console.error('E-Mail senden fehlgeschlagen:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Unbekannter Fehler beim Senden der E-Mail'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 })
  }
}
