import { TypeInsertLearningMaterial } from '@/models';
import { IInputResource } from '@/types/class-based-learning/classwork/attachment.type';

export enum AssignmentStatusEnum {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    PUBLISHED = 'published',
    CLOSED = 'closed',
}



export type ILearningMaterialToUpdate = Pick<TypeInsertLearningMaterial, 'topicId' | 'title' | 'content'|'urls'>;

// export type ILearningMaterialToUpdate = Omit<TypeInsertLearningMaterial, 'createdAt'>;

export type IUpdateLearningMaterialBody = ILearningMaterialToUpdate & {
    inputResources?: IInputResource[];
};

