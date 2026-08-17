import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // The application has no required inline script or inline event-handler
      // contract. Keep executable JavaScript same-origin only.
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      // React and Framer Motion currently emit legitimate dynamic style
      // attributes. Removing this before a style-attribute migration can make
      // the frontend render incorrectly, so the limitation is explicit.
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
});
