
// order-creation
// - date
// - author (system)

// order-cancelled
// - date
// - author (owner or PI or IR)

// comment
// - date
// - author
// - message

// waiting-for-reply
// - date
// - author (IR or PI)

// review-ir-approved
// - date
// - author (IR)

// review-ir-refused
// - date
// - author (IR)

// review-pi-requested
// - date
// - author (IR)

// review-pi-approved
// - date
// - author (PI)

// review-pi-refused
// - date
// - author (PI)

// order-delivered
// - date
// - author (IR or PI)

// order-completed
// - date
// - author (IR or PI)

export const completedStatuses = ["completed", "refusedPI", "refusedIR", "cancelled"];


export const updateTypesToMessage = {
    'order-creation': "Order Created",
    'order-cancelled': "Order Cancelled",
    'comment': "Comment",
    'waiting-for-reply': "Waiting for Reply",
    'review-ir-approved': "Approved by a Reasearch Engineer",
    'review-ir-refused': "Refused by a Reasearch Engineer",
    'review-pi-requested': "Review by a Principal Investigator requested",
    'review-pi-approved': "Approved by a Principal Investigator",
    'review-pi-refused': "Refused by a Principal Investigator",
    'order-processed': "Order Processed",
    'order-received': "Order Delivered, waiting for pick up",
    'order-completed': "Order completed",
    'order-items-updated': "Order items updated",
}

export const statusTypesToMessage = {
    "pendingIR": "Pending Reasearch Engineer review",
    "pendingPI": "Pending Principal Investigator review",
    "refusedPI": "Refused by a Principal Investigator",
    "refusedIR": "Refused by a Reasearch Engineer",
    "processingOrder": "Processing Order",
    "ordered": "Ordered",
    "received": "Waiting for Pick Up",
    "completed": "Completed",
    "cancelled": "Cancelled",
};

export const statusTypesToColor = {
    "pendingIR": "orange",
    "pendingPI": "orange",
    "refusedPI": "red",
    "refusedIR": "red",
    "processingOrder": "blue",
    "ordered": "blue",
    "received": "blue",
    "completed": "green",
    "cancelled": "red",
};

export const updateTypesToColor = {
    "order-creation": "blue",
    "order-cancelled": "red",
    "comment": "blue",
    "waiting-for-reply": "orange",
    "review-ir-approved": "blue",
    "review-ir-refused": "red",
    "review-pi-requested": "orange",
    "review-pi-approved": "blue",
    "review-pi-refused": "red",
    "order-processed": "blue",
    "order-received": "blue",
    "order-completed": "green",
    "order-items-updated": "orange",
}

export const updateTypesToIcon = {
    "order-creation": "add",
    "order-cancelled": "close",
    "comment": "comment",
    "waiting-for-reply": "hourglass",
    "review-ir-approved": "check",
    "review-ir-refused": "close",
    "review-pi-requested": "hourglass",
    "review-pi-approved": "check",
    "review-pi-refused": "close",
    "order-processed": "check",
    "order-received": "check",
    "order-completed": "check",
    "order-items-updated": "edit",
}

export const tagsTypes = [
    "project",
    "stock",
    "asso"
]

export const priorityToColor = {
    "low": "green",
    "medium": "orange",
    "high": "red",
}
