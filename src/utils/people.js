// "aline.becq@devinci.fr" -> "Aline Becq"; accounts use firstname.lastname addresses
export function displayName(email) {
    if (!email) return ''
    return email.split('@')[0].split(/[._-]+/).filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}
