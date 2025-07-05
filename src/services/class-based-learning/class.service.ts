import { customAlphabet } from 'nanoid';
const getRandomNumbers = () =>
    customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 8)();

class ClassService {
    // todo: make sure it unique
    public generateInvitationCode(): string {
        const id = getRandomNumbers();
        return id;
    }
}

export default new ClassService();
