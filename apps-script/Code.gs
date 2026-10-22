function doGet() {
  return jsonResponse({
    success: true,
    message: 'Ticketing email service is running'
  });
}

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('EMAIL_API_SECRET');

    if (!expectedSecret || !safeEquals(request.secret, expectedSecret)) {
      return jsonResponse({ success: false, message: 'Unauthorized' });
    }

    if (
      typeof request.to !== 'string' ||
      !request.to.trim() ||
      typeof request.subject !== 'string' ||
      !request.subject.trim() ||
      typeof request.html !== 'string'
    ) {
      return jsonResponse({ success: false, message: 'Invalid email payload' });
    }

    const plainBody = request.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const options = { htmlBody: request.html, name: 'BitMax Support' };
    if (typeof request.replyTo === 'string' && request.replyTo.trim()) {
      options.replyTo = request.replyTo.trim();
    }

    MailApp.sendEmail(request.to, request.subject, plainBody || request.subject, options);
    return jsonResponse({ success: true, messageId: Utilities.getUuid() });
  } catch (error) {
    console.error('Email delivery failed: ' + error.message);
    return jsonResponse({ success: false, message: 'Email delivery failed' });
  }
}

function safeEquals(actual, expected) {
  if (typeof actual !== 'string' || actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
