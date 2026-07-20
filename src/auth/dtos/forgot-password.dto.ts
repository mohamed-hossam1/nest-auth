import { NormalizedEmail } from 'src/common/decorators/normalized-email.decorator';

export class ForgotPasswordDto {
  @NormalizedEmail()
  email: string;
}
