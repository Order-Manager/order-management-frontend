
// order-creation
// - date
// - author (system)

// order-cancelled
// - date
// - author (owner or IR)

// comment
// - date
// - author
// - message

// waiting-for-reply
// - date
// - author (IR)

// review-ir-approved
// - date
// - author (IR)

// review-ir-refused
// - date
// - author (IR)

// order-delivered
// - date
// - author (IR)

// order-completed
// - date
// - author (IR)

export const completedStatuses = ["completed", "refusedIR", "cancelled"];


export const updateTypesToMessage = {
    'order-creation': "Order Created",
    'order-cancelled': "Order Cancelled",
    'comment': "Comment",
    'waiting-for-reply': "Waiting for Reply",
    'review-ir-approved': "Order Approved",
    'review-requested': "Review Requested",
    'review-ir-refused': "Order Rejected",
    'order-processed': "Order Processed",
    'order-received': "Order Delivered, waiting for pick up",
    'order-completed': "Order completed",
    'order-items-updated': "Order items updated",
    // Only found in older orders
    'review-pi-requested': "PI review requested",
    'review-pi-approved': "Approved by PI",
}

export const statusTypesToMessage = {
    "draft": "Draft",
    "pendingIR": "Pending review",
    "approvedIR": "Approved",
    "refusedIR": "Rejected",
    "processingOrder": "Approved",
    "ordered": "Ordered",
    "received": "Ready for pick-up",
    "completed": "Completed",
    "cancelled": "Cancelled",
};

export const statusTypesToIcon = {
    "draft": "edit_note",
    "pendingIR": "hourglass_top",
    "approvedIR": "thumb_up",
    "refusedIR": "block",
    "processingOrder": "shopping_cart",
    "ordered": "local_shipping",
    "received": "inventory_2",
    "completed": "check_circle",
    "cancelled": "cancel",
};

export const statusTypesToColor = {
    "draft": "grey",
    "pendingIR": "orange",
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
    'review-requested': "orange",
    "review-ir-refused": "red",
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
