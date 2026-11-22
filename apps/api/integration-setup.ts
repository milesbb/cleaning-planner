export default function requireDynamoDbLocal(): void {
  if (process.env.DYNAMODB_ENDPOINT === undefined) {
    throw new Error(
      'Set DYNAMODB_ENDPOINT to a running DynamoDB Local, e.g. http://localhost:8000',
    );
  }
}
