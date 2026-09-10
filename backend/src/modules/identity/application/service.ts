import { AppError } from "../../../platform/errors";
import type { UserView } from "../../../contracts";
export type Account = {
  id: string;
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  authVersion: number;
};
export type Session = {
  hash: string;
  userId: string;
  version: number;
  expiresAt: Date;
};
export interface IdentityRepository {
  find(email: string): Promise<Account | null>;
  get(id: string): Promise<Account | null>;
  create(account: Account): Promise<boolean>;
  challenge(
    userId: string,
    kind: "verify" | "reset",
    hash: string,
    expiresAt: Date,
  ): Promise<void>;
  consume(
    userId: string,
    kind: "verify" | "reset",
    hash: string,
    now: Date,
  ): Promise<boolean>;
  verify(id: string): Promise<void>;
  reset(id: string, password: string): Promise<void>;
  session(session: Session): Promise<void>;
  readSession(hash: string): Promise<Session | null>;
  revoke(hash: string): Promise<void>;
  throttle(
    key: string,
    limit: number,
    windowMs: number,
    now: Date,
  ): Promise<boolean>;
}
export type IdentityDependencies = {
  repository: IdentityRepository;
  hashPassword: (v: string) => Promise<string>;
  comparePassword: (v: string, h: string) => Promise<boolean>;
  digest: (v: string) => string;
  token: () => string;
  code: () => string;
  uuid: () => string;
  now: () => Date;
  send: (
    email: string,
    code: string,
    kind: "verify" | "reset",
  ) => Promise<void>;
};
const view = (a: Account): UserView => ({
  id: a.id,
  username: a.username,
  email: a.email,
});
export function identityService(d: IdentityDependencies) {
  const r = d.repository;
  async function throttle(key: string, limit: number, windowMs: number) {
    if (!(await r.throttle(d.digest(key), limit, windowMs, d.now())))
      throw new AppError(
        429,
        "RATE_LIMIT",
        "Too many attempts. Please try again later.",
      );
  }
  async function issue(a: Account, kind: "verify" | "reset") {
    await throttle(`send:${a.id}:${kind}`, 1, 60000);
    const code = d.code();
    await r.challenge(
      a.id,
      kind,
      d.digest(`${a.id}:${kind}:${code}`),
      new Date(d.now().getTime() + 600000),
    );
    try {
      await d.send(a.email, code, kind);
    } catch {
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email delivery is unavailable. Please request a new code shortly.",
      );
    }
  }
  async function start(a: Account) {
    const token = d.token();
    await r.session({
      hash: d.digest(token),
      userId: a.id,
      version: a.authVersion,
      expiresAt: new Date(d.now().getTime() + 5 * 86400000),
    });
    return { token, user: view(a) };
  }
  return {
    throttle,
    async register(input: {
      username: string;
      email: string;
      password: string;
    }) {
      await throttle(`register:${input.email}`, 3, 3600000);
      if (await r.find(input.email)) return;
      const a: Account = {
        id: d.uuid(),
        ...input,
        password: await d.hashPassword(input.password),
        isVerified: false,
        authVersion: 0,
      };
      if (await r.create(a)) await issue(a, "verify");
    },
    async resend(email: string, kind: "verify" | "reset") {
      await throttle(`resend:${email}:${kind}`, 5, 3600000);
      const a = await r.find(email);
      if (
        a &&
        ((kind === "verify" && !a.isVerified) ||
          (kind === "reset" && a.isVerified))
      )
        await issue(a, kind);
    },
    async verify(email: string, code: string) {
      await throttle(`verify:${email}`, 5, 600000);
      const a = await r.find(email);
      if (
        !a ||
        a.isVerified ||
        !(await r.consume(
          a.id,
          "verify",
          d.digest(`${a.id}:verify:${code}`),
          d.now(),
        ))
      )
        throw new AppError(
          400,
          "INVALID_CODE",
          "The code is invalid or expired.",
        );
      await r.verify(a.id);
      return start({ ...a, isVerified: true });
    },
    async reset(email: string, code: string, password: string) {
      await throttle(`reset:${email}`, 5, 600000);
      const a = await r.find(email);
      if (
        !a ||
        !a.isVerified ||
        !(await r.consume(
          a.id,
          "reset",
          d.digest(`${a.id}:reset:${code}`),
          d.now(),
        ))
      )
        throw new AppError(
          400,
          "INVALID_CODE",
          "The code is invalid or expired.",
        );
      await r.reset(a.id, await d.hashPassword(password));
    },
    async login(email: string, password: string) {
      await throttle(`login:${email}`, 10, 900000);
      const a = await r.find(email);
      // A valid dummy hash keeps unknown-account checks on the password-hashing path.
      const valid = await d.comparePassword(
        password,
        a?.password ??
          "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      );
      if (!a || !valid || !a.isVerified)
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Check your credentials and verify your email before signing in.",
        );
      return start(a);
    },
    async authenticate(token: string | undefined) {
      if (!token) throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");
      const s = await r.readSession(d.digest(token));
      const a = s ? await r.get(s.userId) : null;
      if (
        !s ||
        s.expiresAt <= d.now() ||
        !a ||
        !a.isVerified ||
        a.authVersion !== s.version
      )
        throw new AppError(
          401,
          "UNAUTHENTICATED",
          "Your session has ended. Please sign in.",
        );
      return view(a);
    },
    logout: (token: string | undefined) =>
      token ? r.revoke(d.digest(token)) : Promise.resolve(),
  };
}
