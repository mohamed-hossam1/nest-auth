import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    emailVerificationToken: r.one.emailVerificationTokens({
      from: r.users.id,
      to: r.emailVerificationTokens.userId,
    }),
    passwordResetToken: r.one.passwordResetTokens({
      from: r.users.id,
      to: r.passwordResetTokens.userId,
    }),
    refreshSessions: r.many.refreshSessions({
      from: r.users.id,
      to: r.refreshSessions.userId,
    }),
    ban: r.one.userBans({
      from: r.users.id,
      to: r.userBans.userId,
    }),
    oauthAccounts: r.many.oauthAccounts({
      from: r.users.id,
      to: r.oauthAccounts.userId,
    }),
  },
  userBans: {
    user: r.one.users({
      from: r.userBans.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  emailVerificationTokens: {
    user: r.one.users({
      from: r.emailVerificationTokens.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  passwordResetTokens: {
    user: r.one.users({
      from: r.passwordResetTokens.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  refreshSessions: {
    user: r.one.users({
      from: r.refreshSessions.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  oauthAccounts: {
    user: r.one.users({
      from: r.oauthAccounts.userId,
      to: r.users.id,
      optional: false,
    }),
  },
}));
