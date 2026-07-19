import { Injectable } from '@nestjs/common';
import { genSalt, hash, compare } from 'bcryptjs';
import { HashingService } from './hashing.service';

@Injectable()
export class BcryptService implements HashingService {
  async hash(data: string): Promise<string> {
    const salt = await genSalt();
    return hash(data, salt);
  }

  async compare(data: string, dataHash: string): Promise<boolean> {
    return compare(data, dataHash);
  }
}
