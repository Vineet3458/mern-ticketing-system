const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
    .content { padding: 28px 24px; }
    .ticket-badge { display: inline-block; padding: 6px 12px; background-color: #eff6ff; color: #2563eb; border-radius: 6px; font-weight: 600; font-size: 14px; margin-bottom: 16px; border: 1px solid #bfdbfe; }
    .meta-box { background: #f1f5f9; border-radius: 8px; padding: 14px; margin: 18px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748b; font-weight: 500; }
    .meta-value { font-weight: 600; color: #0f172a; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }
    .reply-hint { margin-top: 24px; padding: 12px; border-left: 4px solid #3b82f6; background-color: #f8fafc; font-size: 13px; color: #475569; }
    .footer { padding: 20px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BitMax Support Portal</h1>
      <p>Customer Experience & Technical Helpdesk</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} BitMax Technology (P) Ltd. All rights reserved.</p>
      <p>Please do not edit the ticket number in the email subject when replying.</p>
    </div>
  </div>
</body>
</html>
`;

export const ticketCreatedTemplate = ({ ticketNumber, subject, description, priority, category, clientUrl }) => {
  const content = `
    <span class="ticket-badge">Ticket Created: ${ticketNumber}</span>
    <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">${subject}</h2>
    <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">We have received your support request. Our engineering and support team will review your ticket and reply as soon as possible.</p>
    
    <div class="meta-box">
      <div style="margin-bottom: 6px;"><strong>Category:</strong> ${category}</div>
      <div style="margin-bottom: 6px;"><strong>Priority:</strong> <span style="text-transform: capitalize;">${priority}</span></div>
      <div><strong>Status:</strong> Open</div>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
      <p style="margin: 0 0 6px; font-weight: 600; font-size: 13px; color: #64748b;">Description:</p>
      <p style="margin: 0; line-height: 1.5; color: #1e293b; font-size: 14px; white-space: pre-wrap;">${description}</p>
    </div>

    <a href="${clientUrl}/tickets/${ticketNumber}" class="button" target="_blank">View Ticket Online</a>

    <div class="reply-hint">
      <strong>Tip:</strong> You can reply directly to this email to add messages to this ticket.
    </div>
  `;
  return baseTemplate(`Ticket Created - ${ticketNumber}`, content);
};

export const ticketAssignedTemplate = ({ ticketNumber, subject, assignedAgentName, clientUrl }) => {
  const content = `
    <span class="ticket-badge">Assignment Notice: ${ticketNumber}</span>
    <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">Ticket Assigned: ${subject}</h2>
    <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">Hello ${assignedAgentName}, a support ticket has been assigned to you for investigation and resolution.</p>
    
    <a href="${clientUrl}/tickets/${ticketNumber}" class="button" target="_blank">Open Ticket Workspace</a>
  `;
  return baseTemplate(`Assigned: ${ticketNumber}`, content);
};

export const ticketEventTemplate = ({ ticketNumber, subject, eventTitle, eventDetails, clientUrl }) => {
  const content = `
    <span class="ticket-badge">Ticket Update: ${ticketNumber}</span>
    <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">${eventTitle}</h2>
    <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">${eventDetails}</p>
    <p style="color: #475569; line-height: 1.6;">Ticket: <strong>${subject}</strong></p>
    <a href="${clientUrl}/tickets/${ticketNumber}" class="button" target="_blank">View Ticket Details</a>
  `;
  return baseTemplate(`${eventTitle} - ${ticketNumber}`, content);
};

export const ticketReplyTemplate = ({ ticketNumber, subject, senderName, replyBody, clientUrl }) => {
  const content = `
    <span class="ticket-badge">New Reply: ${ticketNumber}</span>
    <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">${subject}</h2>
    <p style="color: #475569; margin: 0 0 16px;"><strong>${senderName}</strong> posted a new response to ticket <strong>${ticketNumber}</strong>:</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${replyBody}</div>

    <a href="${clientUrl}/tickets/${ticketNumber}" class="button" target="_blank">Respond in Portal</a>

    <div class="reply-hint">
      <strong>Direct Reply:</strong> Replying directly to this email will automatically append your reply to this conversation.
    </div>
  `;
  return baseTemplate(`New Reply - ${ticketNumber}`, content);
};

export const ticketStatusChangedTemplate = ({ ticketNumber, subject, status, actorName, clientUrl }) => {
  const statusLabels = {
    resolved: 'Resolved',
    closed: 'Closed',
    reopened: 'Reopened',
    in_progress: 'In Progress',
    pending: 'Pending',
    open: 'Open',
  };
  const label = statusLabels[status] || status;

  const content = `
    <span class="ticket-badge">Status Updated: ${ticketNumber}</span>
    <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">${subject}</h2>
    <p style="color: #475569; margin: 0 0 16px;">The status of your ticket has been changed to <strong style="color: #2563eb;">${label}</strong> by ${actorName}.</p>
    
    <a href="${clientUrl}/tickets/${ticketNumber}" class="button" target="_blank">View Ticket Details</a>

    ${status === 'resolved' || status === 'closed' ? `
      <div class="reply-hint">
        <strong>Need more help?</strong> Replying directly to this email will automatically reopen your ticket.
      </div>
    ` : ''}
  `;
  return baseTemplate(`Ticket ${label} - ${ticketNumber}`, content);
};

export const otpTemplate = ({ otp, name, minutes = 5 }) => {
  const content = `
    <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">Your Verification Code</h2>
    <p style="color: #475569; margin: 0 0 16px;">Hello ${name || 'User'}, please use the following one-time password (OTP) to complete your verification:</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 12px 28px; background: #f1f5f9; border: 1px dashed #2563eb; color: #1e3a8a; border-radius: 8px;">
        ${otp}
      </div>
    </div>

    <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0;">This code is valid for <strong>${minutes} minutes</strong>. Never share this code with anyone.</p>
  `;
  return baseTemplate('Your BitMax Verification Code', content);
};
