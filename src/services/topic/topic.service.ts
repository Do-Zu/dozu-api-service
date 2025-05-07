import topicRepo from "@/repositories/topic.repo"

const handleIsExistedTopic = async(topicId: any) => {
    const topic = await topicRepo.handleIsExistedTopic(topicId);
    return topic ? true : false;
}

const topicService = { handleIsExistedTopic };

export default topicService;