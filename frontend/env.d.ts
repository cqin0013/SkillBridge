// Allow importing .json as typed modules
declare module "*.json" {
  const value: unknown;
  export default value;
}
