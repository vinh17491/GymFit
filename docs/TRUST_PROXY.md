# Trust Proxy Configuration

Status: PHASE 33 CHECKPOINT / EXPLICIT NETWORK BOUNDARY

- Default: `TRUST_PROXY` is unset/`false`, so Express does not trust forwarded
  headers for `req.ip`, protocol or secure-request inference.
- Allowed explicit forms include `loopback` or a comma-separated list of
  reviewed proxy IP/CIDR values accepted by Express's proxy address logic.
- Bare `TRUST_PROXY=true` is rejected as an unsafe blanket trust setting.
- Rate-limit keys therefore use the socket-derived client identity by default,
  and a deployment must document the proxy chain before enabling forwarded
  identity.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for the actual reverse-proxy topology.
