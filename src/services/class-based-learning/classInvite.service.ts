import { BadRequest, NotFoundError } from '@/core/error';
import classInviteRepo from '@/repositories/class-based-learning/classInvite.repo';
import userSearchService from '@/services/user/userSearch.service';
import classEnrollmentService from '@/services/class-based-learning/classEnrollment.service';
import { nodemailerTransporter } from '@/libs/nodeMailerTransporter.lib';
import { classInvitationTemplate, classInvitationTextTemplate, ClassInvitationEmailData } from '@/templates/emails/classInvitation.template';
import { 
    IClassInvite, 
    IInviteByEmailBody, 
    IGenerateInviteLinkBody, 
    IJoinViaInviteBody,
    IInviteResponse,
    IInviteEmailBatchResponse,
    IInviteEmailResponse,
    IUserSearchResult,
    IClassInviteWithDetails
} from '@/types/class-based-learning/classInvite.type';
import { customAlphabet } from 'nanoid';
import logger from '@/utils/logger';

class ClassInviteService {
    private readonly tokenAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    private readonly tokenLength = 32;

    /**
     * Generate unique token for invite
     */
    private generateToken(): string {
        const nanoid = customAlphabet(this.tokenAlphabet, this.tokenLength);
        return nanoid();
    }

    /**
     * Generate invite link
     */
    public async generateInviteLink(
        classId: number, 
        invitedBy: number, 
        data: IGenerateInviteLinkBody
    ): Promise<IInviteResponse> {
        const { expiresInDays = 7, useLimit } = data;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Check if there's already an active invite for this class
        const existingInvite = await classInviteRepo.getActiveInviteForClass(classId);
        if (existingInvite) {
            return {
                inviteId: existingInvite.inviteId,
                classId: existingInvite.classId,
                token: existingInvite.token,
                inviteLink: `${process.env.FRONTEND_BASE_URL}/join/${existingInvite.token}`,
                expiresAt: existingInvite.expiresAt,
                useLimit: existingInvite.useLimit,
                usedCount: existingInvite.usedCount,
                status: existingInvite.status,
                createdAt: existingInvite.createdAt,
            };
        }

        // Generate new token
        let token: string;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            token = this.generateToken();
            const existingToken = await classInviteRepo.getInviteByToken(token);
            isUnique = !existingToken;
            attempts++;
        } while (!isUnique && attempts < maxAttempts);

        if (!isUnique) {
            throw new Error('Unable to generate unique token after multiple attempts');
        }

        // Create invite
        const invite = await classInviteRepo.createInvite({
            classId,
            invitedBy,
            token,
            expiresAt,
            useLimit,
        });

        return {
            inviteId: invite.inviteId,
            classId: invite.classId,
            token: invite.token,
            inviteLink: `${process.env.FRONTEND_BASE_URL}/join/${invite.token}`,
            expiresAt: invite.expiresAt,
            useLimit: invite.useLimit,
            usedCount: invite.usedCount,
            status: invite.status,
            createdAt: invite.createdAt,
        };
    }

    /**
     * Invite users by email
     */
    public async inviteByEmail(
        classId: number,
        invitedBy: number,
        data: IInviteByEmailBody
    ): Promise<IInviteEmailBatchResponse> {
        const { emails, expiresInDays = 7, useLimit } = data;
        
        if (emails.length === 0) {
            throw new BadRequest('Email list cannot be empty');
        }

        if (emails.length > 50) {
            throw new BadRequest('Cannot invite more than 50 users at once');
        }

        const results: IInviteEmailResponse[] = [];
        let totalSent = 0;
        let totalFailed = 0;

        // Get existing users by email
        const existingUsers = await userSearchService.getUsersByEmails(emails);
        const existingUserEmails = new Set(existingUsers.map(user => user.email));
        const existingUserIds = existingUsers.map(user => user.userId);

        // Check which users are already in the class
        const usersInClass = await userSearchService.checkUsersInClass(existingUserIds, classId);
        const usersInClassSet = new Set(usersInClass);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        for (const email of emails) {
            try {
                // Check if user is already in class
                const existingUser = existingUsers.find(user => user.email === email);
                if (existingUser && usersInClassSet.has(existingUser.userId)) {
                    results.push({
                        success: false,
                        email,
                        message: 'User is already in this class',
                    });
                    totalFailed++;
                    continue;
                }

                // Check if invite already exists for this email and class
                const existingInvite = await classInviteRepo.getInviteByEmailAndClass(email, classId);
                if (existingInvite) {
                    results.push({
                        success: false,
                        email,
                        message: 'Invite already sent to this email',
                    });
                    totalFailed++;
                    continue;
                }

                // Generate unique token
                let token: string;
                let isUnique = false;
                let attempts = 0;
                const maxAttempts = 10;

                do {
                    token = this.generateToken();
                    const existingToken = await classInviteRepo.getInviteByToken(token);
                    isUnique = !existingToken;
                    attempts++;
                } while (!isUnique && attempts < maxAttempts);

                if (!isUnique) {
                    results.push({
                        success: false,
                        email,
                        message: 'Unable to generate unique token',
                    });
                    totalFailed++;
                    continue;
                }

                // Create invite record
                const invite = await classInviteRepo.createInvite({
                    classId,
                    invitedBy,
                    invitedUserId: existingUser?.userId,
                    invitedEmail: email,
                    token,
                    expiresAt,
                    useLimit,
                });

                // Send email
                const inviteLink = `${process.env.FRONTEND_BASE_URL}/join/${token}`;
                const emailSent = await this.sendClassInvitationEmail({
                    to: email,
                    className: 'Class Name', // Will be fetched from class service
                    teacherName: 'Teacher Name', // Will be fetched from user service
                    inviteLink,
                    studentName: existingUser?.fullName || undefined,
                    expiresAt,
                });

                if (emailSent) {
                    results.push({
                        success: true,
                        email,
                        message: 'Invite sent successfully',
                    });
                    totalSent++;
                } else {
                    results.push({
                        success: false,
                        email,
                        message: 'Failed to send email',
                    });
                    totalFailed++;
                }

            } catch (error) {
                logger.error(`Error inviting user ${email}:`, error);
                results.push({
                    success: false,
                    email,
                    message: 'Internal server error',
                });
                totalFailed++;
            }
        }

        return {
            totalSent,
            totalFailed,
            results,
        };
    }

    /**
     * Search users to invite
     */
    public async searchUsersToInvite(query: string, classId: number): Promise<IUserSearchResult[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const users = await userSearchService.searchUsers(query, classId);
        return users;
    }

    /**
     * Accept invite
     */
    public async acceptInvite(userId: number, data: IJoinViaInviteBody): Promise<void> {
        const { token } = data;

        const invite = await classInviteRepo.getInviteByToken(token);
        if (!invite) {
            throw new NotFoundError('Invalid invite token');
        }

        // Validate invite
        const isValid = await this.validateInvite(invite);
        if (!isValid) {
            throw new BadRequest('Invite has expired or reached usage limit');
        }

        // Check if user is already in class
        const isAlreadyInClass = await classEnrollmentService.isStudentInClass(invite.classId, userId);
        if (isAlreadyInClass) {
            throw new BadRequest('You are already in this class');
        }

        // Add user to class
        await classEnrollmentService.addStudentToClass(invite.classId, userId);

        // Update invite status and increment use count
        await classInviteRepo.updateInviteStatus(invite.inviteId, 'accepted');
        await classInviteRepo.incrementUseCount(invite.inviteId);
    }

    /**
     * Reject invite
     */
    public async rejectInvite(userId: number, data: IJoinViaInviteBody): Promise<void> {
        const { token } = data;

        const invite = await classInviteRepo.getInviteByToken(token);
        if (!invite) {
            throw new NotFoundError('Invalid invite token');
        }

        await classInviteRepo.updateInviteStatus(invite.inviteId, 'rejected');
    }

    /**
     * Get pending invites for a class
     */
    public async getPendingInvites(classId: number): Promise<IClassInviteWithDetails[]> {
        const invites = await classInviteRepo.getInvitesByClassId(classId);
        return invites.filter(invite => invite.status === 'pending');
    }

    /**
     * Regenerate invite link
     */
    public async regenerateInviteLink(
        classId: number,
        invitedBy: number,
        data: IGenerateInviteLinkBody
    ): Promise<IInviteResponse> {
        const { expiresInDays = 7, useLimit } = data;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Generate new token
        let token: string;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            token = this.generateToken();
            const existingToken = await classInviteRepo.getInviteByToken(token);
            isUnique = !existingToken;
            attempts++;
        } while (!isUnique && attempts < maxAttempts);

        if (!isUnique) {
            throw new Error('Unable to generate unique token after multiple attempts');
        }

        // Regenerate invite
        const invite = await classInviteRepo.regenerateInviteToken(classId, token, expiresAt, useLimit);

        return {
            inviteId: invite.inviteId,
            classId: invite.classId,
            token: invite.token,
            inviteLink: `${process.env.FRONTEND_BASE_URL}/join/${invite.token}`,
            expiresAt: invite.expiresAt,
            useLimit: invite.useLimit,
            usedCount: invite.usedCount,
            status: invite.status,
            createdAt: invite.createdAt,
        };
    }

    /**
     * Validate invite
     */
    public async validateInvite(invite: IClassInvite): Promise<boolean> {
        // Check if invite is still pending
        if (invite.status !== 'pending') {
            return false;
        }

        // Check if invite has expired
        if (invite.expiresAt <= new Date()) {
            return false;
        }

        // Check if invite has reached use limit
        if (invite.useLimit && invite.usedCount >= invite.useLimit) {
            return false;
        }

        return true;
    }

    /**
     * Send class invitation email
     */
    private async sendClassInvitationEmail(data: {
        to: string;
        className: string;
        teacherName: string;
        inviteLink: string;
        studentName?: string;
        expiresAt: Date;
    }): Promise<boolean> {
        try {
            const emailData: ClassInvitationEmailData = {
                className: data.className,
                teacherName: data.teacherName,
                inviteLink: data.inviteLink,
                studentName: data.studentName,
                expiresAt: data.expiresAt,
            };

            const htmlContent = classInvitationTemplate(emailData);
            const textContent = classInvitationTextTemplate(emailData);

            const info = await nodemailerTransporter.sendMail({
                from: `"Dozu Learning" <${process.env.MAIL_USERNAME}>`,
                to: data.to,
                subject: `🎓 Lời mời tham gia lớp học: ${data.className}`,
                text: textContent,
                html: htmlContent,
            });

            logger.info(`Class invitation email sent to ${data.to}:`, info.messageId);
            return true;
        } catch (error) {
            logger.error(`Failed to send class invitation email to ${data.to}:`, error);
            return false;
        }
    }

    /**
     * Cleanup expired invites
     */
    public async cleanupExpiredInvites(): Promise<{ deleted: number; updated: number }> {
        const deleted = await classInviteRepo.deleteExpiredInvites();
        const updated = await classInviteRepo.updateExpiredInvitesStatus();
        
        return { deleted, updated };
    }

    /**
     * Get invite statistics for a class
     */
    public async getInviteStats(classId: number) {
        return await classInviteRepo.getInviteStats(classId);
    }
}

export default new ClassInviteService();
