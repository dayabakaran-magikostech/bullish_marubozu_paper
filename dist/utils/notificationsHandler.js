"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationHandler = notificationHandler;
exports.sendNotification = sendNotification;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const helper_1 = require("./helper");
/**
 * Handles error and log messages and sends them to the chat if specified.
 */
async function notificationHandler(message, options, notifyOnChat = false) {
    const { module = 'Unknown', severity, type = 'Info' } = options;
    const notificationObj = {
        message,
        severity,
        timestamp: (0, helper_1.getCurrTimeStamp)(new Date()),
    };
    const title = `[${module} ${type}]`;
    const isError = type === 'Error';
    isError ? console.error(title + ' : ', notificationObj) : console.log(title, notificationObj);
    if (notifyOnChat)
        await sendNotification(title, notificationObj);
    return !isError;
}
/**
 * Sends a notification to the Google Chat webhook URL with the given title and
 * notification details. The notification object should contain the message to
 * be sent, the severity of the message, and the timestamp when the message was
 * triggered. If the notification object contains a severity, it will be
 * displayed in the Google Chat card. If the request to the webhook fails, the
 * function will retry up to 5 times with a 5 second delay between retries.
 */
async function sendNotification(title, notification, maxRetries = 5) {
    const url = config_1.ENV.chatWebhookUrl;
    if (!url)
        return;
    const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
    };
    const { message, severity, timestamp } = notification;
    let formattedMessage = null;
    if (Array.isArray(message)) {
        formattedMessage = message.map((m) => JSON.stringify(m)).join('\n');
    }
    else if (typeof message === 'object') {
        formattedMessage = JSON.stringify(message);
    }
    else {
        formattedMessage = message;
    }
    let webhookMsgStr = `<b>${title}</font></b><br><br><b>Message:</b> ${formattedMessage}\n<b>Timestamp:</b> ${timestamp}`;
    if (severity)
        webhookMsgStr += `\n<b>Severity:</b> ${severity}`;
    const payload = {
        cards: [
            {
                sections: [
                    {
                        widgets: [
                            {
                                textParagraph: {
                                    text: webhookMsgStr,
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    };
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await axios_1.default.post(url, payload, { headers });
            break;
        }
        catch (err) {
            if (attempt === maxRetries) {
                console.error(' [Webhook Error]: All retry attempts failed. ');
            }
            else {
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    }
}
//# sourceMappingURL=notificationsHandler.js.map