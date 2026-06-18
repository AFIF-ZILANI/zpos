import { resend } from "../lib/resend"
import { inviteEmailHtml } from "../lib/emails/invite"

interface SendInviteParams {
    toEmail: string
    invitedBy: string
    role: string
}

export async function sendInviteEmail({
    toEmail,
    invitedBy,
    role,
}: SendInviteParams) {
    const loginUrl = `${process.env.CLIENT_URL}/login`

    const { data, error } = await resend.emails.send({
        from: `zPOS App <noreply@${process.env.EMAIL_DOMAIN}>`,
        to: toEmail,
        subject: `You're invited to POS App`,
        html: inviteEmailHtml({ invitedBy, role, loginUrl }),
    })

    if (error) {
        throw new Error(`Failed to send invite email: ${error.message}`)
    }

    return data
}