export interface IClass {
    classId: number;
    name: string;
    description: string;
    invitationCode: string;
    createdAt: Date;

    // optional (teacher)
    teacherId?: number;
    teacherName?: string | null;
    teacherImageUrl?: string;

    imageUrl?: string | null;

    // only for student
    classEnrollmentId?: number;
    enrolledAt?: Date;
}

export type ICreateClassBody = Pick<IClass, 'name' | 'description'>;
export type ICreateClassResponse = Pick<
    IClass,
    'classId' | 'name' | 'description' | 'invitationCode' | 'createdAt' | 'imageUrl'
>;
export type IUpdateClassBody = Pick<IClass, 'name' | 'description'>;
export type IUpdateClassResponse = Pick<IClass, 'classId' | 'name' | 'description' | 'imageUrl'>;
