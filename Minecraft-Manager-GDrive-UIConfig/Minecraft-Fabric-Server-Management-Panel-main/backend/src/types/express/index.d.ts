import { User } from '../User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {}; // to make it a module
