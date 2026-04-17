# Mailchimp Metric Definitions

This file is the canonical glossary of Mailchimp metrics. The agent reads this at the start of each audit to identify metrics on pages and recommend tooltip text where missing.

Sources:
- https://mailchimp.com/help/custom-report-metrics/
- https://mailchimp.com/help/marketing-dashboard-metrics/

---

## Email Engagement Metrics

### Open Rate
- **Definition**: The percentage of total recipients (successful deliveries) who opened the email campaign or text message.
- **Formula**: (Unique Opens / Successful Deliveries) x 100
- **Tooltip**: Percentage of delivered emails opened by recipients.
- **Search Terms**: open rate, opens, unique opens, opened

### Opened
- **Definition**: The number of recipients who opened the email campaign or text message.
- **Tooltip**: Number of unique recipients who opened this message.
- **Search Terms**: opened, unique opens, recipients who opened

### Total Opens
- **Definition**: The total number of times the email was opened by recipients, including multiple opens by the same contact.
- **Tooltip**: Total open count, including repeat opens by the same recipient.
- **Search Terms**: total opens, all opens

### Click Rate
- **Definition**: The percentage of delivered emails and text messages that registered at least one click.
- **Formula**: (Unique Clicks / Successful Deliveries) x 100
- **Tooltip**: Percentage of delivered messages that received at least one click.
- **Search Terms**: click rate, CTR, click-through rate, clicks

### Clicked
- **Definition**: The number of recipients who clicked any tracked link in a message.
- **Tooltip**: Number of unique recipients who clicked a tracked link.
- **Search Terms**: clicked, unique clicks, recipients who clicked

### Total Clicks
- **Definition**: Count of all tracked link clicks, including multiple clicks from individual contacts.
- **Tooltip**: Total click count, including repeat clicks by the same recipient.
- **Search Terms**: total clicks, all clicks

### Clicks per Unique Opens
- **Definition**: The percentage of subscribed contacts who opened the email and then clicked a link. Also known as click-to-open rate (CTOR).
- **Formula**: (Unique Clicks / Unique Opens) x 100
- **Tooltip**: Of those who opened, the percentage who also clicked. Also called CTOR.
- **Search Terms**: clicks per unique opens, CTOR, click-to-open rate, click to open

### Unsubscribed
- **Definition**: The number of recipients who unsubscribed from your emails or text messages.
- **Tooltip**: Number of recipients who opted out after receiving this message.
- **Search Terms**: unsubscribed, unsubscribes, opted out

### Unsubscribe Rate
- **Definition**: The percentage of subscribed contacts who unsubscribed from your emails or text messages.
- **Formula**: (Unsubscribes / Successful Deliveries) x 100
- **Tooltip**: Percentage of recipients who unsubscribed after this message.
- **Search Terms**: unsubscribe rate, unsub rate

---

## Email Delivery Metrics

### Emails Sent / Total Messages Sent
- **Definition**: The number of emails or messages that were sent (not necessarily delivered).
- **Tooltip**: Total messages sent, including those that may not have been delivered.
- **Search Terms**: emails sent, sent, total sent, messages sent, sends, total messages sent

### Successful Deliveries / Delivered
- **Definition**: The number of emails or messages successfully delivered to recipients' inboxes.
- **Tooltip**: Messages that successfully reached recipients' inboxes.
- **Search Terms**: successful deliveries, delivered, deliveries

### Delivery Rate
- **Definition**: The percentage of emails and text messages that were successfully delivered.
- **Formula**: (Successful Deliveries / Emails Sent) x 100
- **Tooltip**: Percentage of sent messages that were successfully delivered.
- **Search Terms**: delivery rate, deliverability

### Bounces
- **Definition**: The number of emails that weren't delivered to your recipients' inboxes. Includes both hard bounces (permanent failures) and soft bounces (temporary issues).
- **Tooltip**: Emails that failed to deliver, including hard and soft bounces.
- **Search Terms**: bounces, bounced, hard bounce, soft bounce

### Bounce Rate
- **Definition**: The percentage of emails that weren't successfully delivered to your recipients' inboxes.
- **Formula**: (Bounces / Emails Sent) x 100
- **Tooltip**: Percentage of sent emails that failed to deliver.
- **Search Terms**: bounce rate

### Undelivered
- **Definition**: Count of messages that couldn't be delivered to recipients.
- **Tooltip**: Messages that could not be delivered to recipients' inboxes.
- **Search Terms**: undelivered, not delivered, failed delivery

### Undelivered Rate
- **Definition**: Messages failing delivery divided by total messages sent.
- **Formula**: (Undelivered / Emails Sent) x 100
- **Tooltip**: Percentage of sent messages that failed to deliver.
- **Search Terms**: undelivered rate

### Abuse Complaints / Abuse Reports
- **Definition**: The number of recipients who reported your email as spam.
- **Tooltip**: Recipients who marked this email as spam in their email client.
- **Search Terms**: abuse complaints, abuse reports, spam complaints, marked as spam

### Abuse Rate / Abuse Report Rate
- **Definition**: The percentage of emails that subscribed contacts mark as spam.
- **Formula**: (Abuse Complaints / Successful Deliveries) x 100
- **Tooltip**: Percentage of delivered emails reported as spam by recipients.
- **Search Terms**: abuse rate, abuse report rate, spam rate, complaint rate

---

## E-commerce Metrics

### Revenue
- **Definition**: The money received from your connected store, minus taxes and shipping fees.
- **Tooltip**: Total revenue from connected store orders, excluding taxes and shipping.
- **Search Terms**: revenue, sales, total revenue, total sales

### Orders
- **Definition**: The number of orders placed by subscribers in your connected store, including refunded or canceled orders.
- **Tooltip**: Total orders placed through your connected store.
- **Search Terms**: orders, total orders, order count

### Average Order Revenue
- **Definition**: The amount of revenue divided by the number of orders, excluding taxes and shipping.
- **Formula**: Revenue / Orders
- **Tooltip**: Average revenue per order, excluding taxes and shipping.
- **Search Terms**: average order revenue, avg order revenue, AOV, average order value

### Order Rate
- **Definition**: The percentage of successfully delivered emails that resulted in an order in your connected store.
- **Formula**: (Orders / Successful Deliveries) x 100
- **Tooltip**: Percentage of delivered emails that led to a store order.
- **Search Terms**: order rate, conversion rate

### Fulfilled Order
- **Definition**: Orders marked as fulfilled in connected storefronts.
- **Tooltip**: Orders that have been completed and marked as fulfilled.
- **Search Terms**: fulfilled order, fulfilled, completed order

### Canceled Order
- **Definition**: Orders that were created but canceled before fulfillment.
- **Tooltip**: Orders that were placed but canceled before being fulfilled.
- **Search Terms**: canceled order, cancelled, canceled

### Refunded Order
- **Definition**: Paid orders that were returned in your connected Shopify, WooCommerce, Big Cartel, or BigCommerce store.
- **Tooltip**: Previously paid orders that were refunded through your connected store.
- **Search Terms**: refunded order, refunded, refund

### Average Revenue per Subscribed Contact / Recipient
- **Definition**: Total revenue divided by the number of message recipients.
- **Formula**: Revenue / Recipients
- **Tooltip**: Average revenue generated per message recipient.
- **Search Terms**: average revenue per contact, avg revenue per recipient, revenue per subscriber, revenue per contact

---

## Audience Metrics

### Contacts
- **Definition**: The total number of contacts in your audience, including subscribed, unsubscribed, non-subscribed, and cleaned contacts.
- **Tooltip**: Total contacts in your audience across all subscription statuses.
- **Search Terms**: contacts, total contacts, audience size, subscribers

### Subscribed Contacts
- **Definition**: Contacts who have opted in to receive your email marketing.
- **Tooltip**: Contacts who have actively opted in to receive your emails.
- **Search Terms**: subscribed contacts, subscribed, active subscribers

### New Subscribers
- **Definition**: Contacts who subscribed to your audience during the selected time period.
- **Tooltip**: New contacts who subscribed during this period.
- **Search Terms**: new subscribers, new contacts, new signups

### List Growth Rate
- **Definition**: The rate at which your audience is growing, accounting for new subscribers, unsubscribes, and bounces.
- **Tooltip**: Net growth rate of your audience over the selected period.
- **Search Terms**: list growth rate, growth rate, audience growth

### Cleaned Contacts
- **Definition**: Contacts that were removed from your audience due to repeated hard bounces or abuse complaints.
- **Tooltip**: Contacts removed due to hard bounces or spam complaints.
- **Search Terms**: cleaned, cleaned contacts

---

## Campaign Performance Metrics

### Campaign Performance
- **Definition**: An aggregate view of how your email campaigns performed during the selected period, compared to your averages.
- **Tooltip**: Overview of campaign performance compared to your historical averages.
- **Search Terms**: campaign performance, performance overview

### Engagement
- **Definition**: A measure of how actively your contacts interact with your campaigns, based on opens and clicks.
- **Tooltip**: How actively recipients interact with your campaigns via opens and clicks.
- **Search Terms**: engagement, engagement rate, engagement score

### Audience Growth
- **Definition**: How your audience size changed over the selected period, including new subscribers and lost contacts.
- **Tooltip**: Net change in audience size during the selected period.
- **Search Terms**: audience growth, list growth, subscriber growth
