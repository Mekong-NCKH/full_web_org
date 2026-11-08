export type User = {
  _id: string;
  googleId: string;
  appleId: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  dateOfBirth: string | null;
  email: string;
  phone: string | null;
  isManager: boolean;
  isStudent: boolean;
  isChairman: boolean;
  isTutor: boolean;
  isCoordinator: boolean;
  statisticalPermission: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  socialMedia?: {
    facebookUrl?: string;
    facebookName?: string;
  };
  address: string;
  highSchool: string | null;
};
