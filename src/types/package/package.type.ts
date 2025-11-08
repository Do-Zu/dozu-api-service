export type PackageRecord = {
    id: number;
    title: string;
    parentId: number | null;
};

export type TopicInPackageRecord = {
    topicId: number;
    packageId: number | null;
    name: string;
    description?: string;
    classId?: number | null;
};
