export interface IClassEnrollment {
    classEnrollmentId: number;
    classId: number;
    studentId: number;
    enrolledAt: Date;
}

export interface IJoinClassBody {
    invitationCode: string
}