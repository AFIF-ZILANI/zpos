function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

export function inviteEmailHtml({
    invitedBy,
    role,
    loginUrl,
}: {
    invitedBy: string
    role: string
    loginUrl: string
}) {
    const safeInvitedBy = escapeHtml(invitedBy)
    const safeRole = escapeHtml(role)
    return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>You're invited to Sabbirs Point zPOS</h2>
        <p>Hi there,</p>
        <p><strong>${safeInvitedBy}</strong> has invited you to join as a <strong>${safeRole}</strong>.</p>
        <p>Click the button below to login and get started:</p>
        
          <a href="${loginUrl}"
          style="
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin: 16px 0;
          "
        >
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">
          If you didn't expect this invitation, you can ignore this email.
        </p>
      </body>
    </html>
  `
}