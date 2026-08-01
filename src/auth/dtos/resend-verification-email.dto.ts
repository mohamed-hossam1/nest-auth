import { NormalizedEmail } from 'src/common/decorators/normalized-email.decorator';

export class ResendVerificationEmailDto {
  @NormalizedEmail()
  email: string;
}
