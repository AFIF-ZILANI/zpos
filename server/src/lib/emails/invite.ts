export function inviteEmailHtml({
    invitedBy,
    role,
    loginUrl,
}: {
    invitedBy: string
    role: string
    loginUrl: string
}) {
    return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>You're invited to Sabbirs Point zPOS</h2>
        <p>Hi there,</p>
        <p><strong>${invitedBy}</strong> has invited you to join as a <strong>${role}</strong>.</p>
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