import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { processInboundEmail } from '../../services/inboundEmail.service.js';

export const handleInboundWebhook = asyncHandler(async (req, res) => {
  // Support standard webhook formats (SendGrid inbound, Mailgun, or direct BitMax format)
  const body = req.body || {};
  const from = body.from || body.sender || body.envelope?.from || body.From || '';
  const to = body.to || body.recipient || body.envelope?.to || body.To || '';
  const subject = body.subject || body.Subject || '';
  const messageBody = body.body || body.text || body.strippedText || body['body-plain'] || '';
  const html = body.html || body['body-html'] || '';
  const messageId = body.messageId || body['message-id'] || body['Message-Id'] || body.providerMessageId || '';
  const senderName = body.senderName || body.name || '';
  const headers = body.headers || {};

  const result = await processInboundEmail({
    from,
    senderName,
    to,
    subject,
    body: messageBody,
    html,
    messageId,
    headers,
    attachments: body.attachments || [],
  });

  return sendResponse(res, result.success ? 200 : 400, result.message, result);
});
