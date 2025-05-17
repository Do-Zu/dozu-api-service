import express from 'express';

interface CurrentUserType {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: any;
    }
  }
}

export {};
