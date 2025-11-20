export function buildExampleQuery(schema, fieldName) {
    const field = schema.queries.find((q) => q.name === fieldName);
    if (!field)
        return "# Field not found in schema";
    const args = field.args
        .map((arg, index) => `$var${index}: ${arg.split(":")[1].trim()}`)
        .join(", ");
    const argValues = field.args
        .map((arg, index) => `${arg.split(":")[0].trim()}: $var${index}`)
        .join(", ");
    const header = args.length ? `(${args})` : "";
    return `query Generated${field.name}${header} {\n  ${field.name}${argValues ? `(${argValues})` : ""} {\n    __typename\n  }\n}`;
}
export function buildExampleMutation(schema, fieldName) {
    const field = schema.mutations.find((m) => m.name === fieldName);
    if (!field)
        return "# Mutation not found in schema";
    const args = field.args
        .map((arg, index) => `$var${index}: ${arg.split(":")[1].trim()}`)
        .join(", ");
    const argValues = field.args
        .map((arg, index) => `${arg.split(":")[0].trim()}: $var${index}`)
        .join(", ");
    const header = args.length ? `(${args})` : "";
    return `mutation Generated${field.name}${header} {\n  ${field.name}${argValues ? `(${argValues})` : ""} {\n    __typename\n  }\n}`;
}
