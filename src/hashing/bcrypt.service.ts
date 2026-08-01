import { Injectable } from '@nestjs/common';
import { hash, compare } from '@node-rs/bcrypt';
import { HashingService } from './hashing.service';

@Injectable()
export class BcryptService implements HashingService {
  async hash(data: string): Promise<string> {
    return hash(data, 10);
  }

  async compare(data: string, dataHash: string): Promise<boolean> {
    return compare(data, dataHash);
  }
}
