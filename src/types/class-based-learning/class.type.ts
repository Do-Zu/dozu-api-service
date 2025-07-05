export interface IClass {
    classId: number;
    teacherId?: number;
    imageUrl?: string;
    name: string;
    description: string;
    invitationCode: string;
    createdAt: Date;

    // only for student
    classEnrollmentId?: number;
    enrolledAt?: Date;
}

export type ICreateClassPayload = Pick<IClass, 'name' | 'description'>;
export type ICreateClassResponse = Pick<IClass, 'classId' | 'name' | 'description' | 'invitationCode' | 'createdAt'>;
export type IUpdateClassPayload = Pick<IClass, 'classId' | 'name' | 'description'>;
export type IUpdateClassResponse = Pick<IClass, 'classId' | 'name' | 'description'>;

export interface IJoinClassPayload {
    classId: number;
    studentId: number;
}
