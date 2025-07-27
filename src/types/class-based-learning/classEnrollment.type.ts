export interface IClassEnrollment {
    classEnrollmentId: number;
    classId: number;
    studentId: number;
    enrolledAt: Date;
}

export interface IJoinClassBody {
    invitationCode: string;
}

export interface IStudentInClass {
    userId: number;
    username: string;
    fullName: string | null;
    avatarUrl: string;
    enrolledAt: Date;
}
