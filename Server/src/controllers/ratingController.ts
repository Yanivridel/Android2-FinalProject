import { Request, Response } from 'express';
import { ratingModel } from '../models/ratingModel';
import { AuthenticatedRequest } from 'types/expressTypes';
import { userModel } from 'models/userModel';
import { postModel } from 'models/postModel';
import { commentModel } from 'models/commentModel';
import mongoose, { Types } from 'mongoose';
import { IUser } from 'types/userTypes';

// Help Functions
export const recalculateUserRating = async (userId: mongoose.Types.ObjectId) => {
    const [userRatings, postRatings, commentRatings] = await Promise.all([
        ratingModel.find({ targetType: 'User', targetId: userId }),
        ratingModel.find({ targetType: 'Post' }),
        ratingModel.find({ targetType: 'Comment' }),
    ]);

    const [userPosts, userComments] = await Promise.all([
        postModel.find({ author: userId }, '_id'),
        commentModel.find({ author: userId }, '_id'),
    ]);

    const postIds = userPosts.map(p => p._id.toString());
    const commentIds = userComments.map(c => c._id.toString());

    const userPostRatings = postRatings.filter(r => postIds.includes(r.targetId.toString()));
    const userCommentRatings = commentRatings.filter(r => commentIds.includes(r.targetId.toString()));

    const hasUserRatings = userRatings.length > 0;
    const hasPostRatings = userPostRatings.length > 0;
    const hasCommentRatings = userCommentRatings.length > 0;

    const totalRatings = userRatings.length + userPostRatings.length + userCommentRatings.length;
    if (totalRatings === 0) {
        await userModel.findByIdAndUpdate(userId, {
            'ratingStats.averageScore': 2.5,
            'ratingStats.totalRatings': 0,
        });
        return;
    }

    // 1. Define intended weights
    const weights = {
        user: 0.5,
        post: 0.35,
        comment: 0.15,
    };

    // 2. Filter only present categories
    const presentWeights: { [key: string]: number } = {};
    if (hasUserRatings) presentWeights.user = weights.user;
    if (hasPostRatings) presentWeights.post = weights.post;
    if (hasCommentRatings) presentWeights.comment = weights.comment;

    // 3. Normalize the present weights
    const totalWeight = Object.values(presentWeights).reduce((a, b) => a + b, 0);
    for (const key in presentWeights) {
        presentWeights[key] /= totalWeight;
    }

    // 4. Compute weighted average
    const avg = (ratings: typeof userRatings) =>
        ratings.reduce((sum, r) => sum + r.rating, 0) / (ratings.length || 1);

    const weightedSum =
        (hasUserRatings ? avg(userRatings) * presentWeights.user : 0) +
        (hasPostRatings ? avg(userPostRatings) * presentWeights.post : 0) +
        (hasCommentRatings ? avg(userCommentRatings) * presentWeights.comment : 0);

    const averageScore = parseFloat(weightedSum.toFixed(2));

    await userModel.findByIdAndUpdate(userId, {
        'ratingStats.averageScore': averageScore,
        'ratingStats.totalRatings': totalRatings,
    });
};

// Create a new rating
export const createRating = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { targetType, targetId, rating } = req.body;
        const userDb = (req.userDb)

        if(!userDb){
            res.status(401).json({ message: 'User unauthorized' });
            return
        }

        const rater = new Types.ObjectId(String(userDb._id));

        if (!targetType || !targetId || !rating) {
            res.status(400).json({ message: 'targetType, targetId, and rating are required.' });
            return;
        }

        let ratingDoc = await ratingModel.findOne({ rater, targetType, targetId });
        const isNew = !ratingDoc;

        if (!ratingDoc) {
            ratingDoc = new ratingModel({ rater, targetType, targetId, rating });
        } else {
            ratingDoc.rating = rating;
        }

        await ratingDoc.save();

        let userToUpdate: mongoose.Types.ObjectId | null = null;

        if (targetType === 'Post') {
            const post = await postModel.findById(targetId);
            if (post) {
                userToUpdate = post.author;

                // Update post.likes - ensure likes array exists and handle ObjectId comparison properly
                if (!post.likes) {
                    post.likes = [];
                }
                if (!post.likes.some(id => id.toString() === rater.toString())) {
                    post.likes.push(rater);
                    await post.save();
                }

                // Update user's likedPosts - ensure likedPosts array exists
                if (!userDb.likedPosts) {
                    userDb.likedPosts = [];
                }
                if (!userDb.likedPosts.some(id => id.toString() === post._id.toString())) {
                    userDb.likedPosts.push(post.id);
                    await userDb.save();
                }
            }
        } else if (targetType === 'Comment') {
            const comment = await commentModel.findById(targetId);
            if (comment) {
                userToUpdate = comment.author;

                // Update comment.likes - ensure likes array exists
                if (!comment.likes) {
                    comment.likes = [];
                }
                if (!comment.likes.some(id => id.toString() === rater.toString())) {
                    comment.likes.push(rater);
                    await comment.save();
                }

                // Update user's likedComments - ensure likedComments array exists
                if (!req.userDb!.likedComments) {
                    req.userDb!.likedComments = [];
                }
                if (!req.userDb!.likedComments.some(id => id.toString() === comment._id.toString())) {
                    req.userDb!.likedComments.push(comment.id);
                    await userDb.save();
                }
            }
        } else if (targetType === 'User') {
            // Convert targetId to ObjectId if it's a string
            userToUpdate = typeof targetId === 'string' ? new Types.ObjectId(targetId) : targetId;
            // As requested — no "like" fields updates for users
        }

        if (userToUpdate) {
            await recalculateUserRating(userToUpdate);
        }

        res.status(isNew ? 201 : 200).json(ratingDoc);
    } catch (error) {
        console.error('Error creating rating:', error);
        res.status(500).json({ message: 'Failed to create rating' });
    }
};


// Get all ratings for a specific target (user/post/comment)
export const getRatingsByTarget = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { targetType, targetId } = req.query;

        if (!targetType || !targetId) {
            res.status(400).json({ message: 'targetType and targetId query parameters are required.' });
            return;
        }

        const ratings = await ratingModel.find({
        targetType,
        targetId,
        }).populate('rater', 'username'); // populate rater username (optional)

        res.status(200).json(ratings);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch ratings' });
    }
};

export const getMyRating = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userDb?._id;

        const ratings = await userModel.findById(userId)
        .select("ratingStats")

        res.status(200).json(ratings);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch ratings' });
    }
};

// Get average rating for a specific target
export const getAverageRatingForTarget = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { targetType, targetId } = req.query;

        if (!targetType || !targetId) {
            res.status(400).json({ message: 'targetType and targetId query parameters are required.' });
            return;
        }

        const objectTargetId = new mongoose.Types.ObjectId(targetId as string);

        const result = await ratingModel.aggregate([
            { $match: { targetType, targetId: objectTargetId } },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const averageScore = result[0]?.averageScore || 0;
        const count = result[0]?.count || 0;

        res.status(200).json({ averageScore, count });
    } catch (error) {
        console.error('Error getting average rating:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get average rating' });
    }
};

// Update a rating by ID
export const updateRatingByTarget = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const rater = req.userDb?._id;
        const { targetType, targetId, rating } = req.body;

        // Validate required params
        if (!targetType || !targetId || !rating) {
            res.status(400).json({ message: 'targetType, targetId, and rating query parameters are required.' });
            return;
        }

        // rating from query is string, convert to number
        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
            return;
        }

        // Find existing rating by this rater for this target
        let ratingDoc = await ratingModel.findOne({ rater, targetType, targetId });

        if (ratingDoc) {
            // Update rating
            ratingDoc.rating = ratingNum;
            await ratingDoc.save();
        } else {
            // Create new rating
            ratingDoc = new ratingModel({
                rater,
                targetType,
                targetId,
                rating: ratingNum,
            });
            await ratingDoc.save();
        }

        // Determine the user to update rating for
        let userToUpdate: mongoose.Types.ObjectId | null = null;

        if (targetType === 'User') {
            userToUpdate = targetId;
        } else if (targetType === 'Post') {
            const post = await postModel.findById(targetId);
            if (post) userToUpdate = post.author;
        } else if (targetType === 'Comment') {
            const comment = await commentModel.findById(targetId);
            if (comment) userToUpdate = comment.author;
        }

        if (userToUpdate) {
            await recalculateUserRating(userToUpdate);
        }

        res.status(200).json(ratingDoc);
    } catch (error) {
        console.error('Error updating rating:', error);
        res.status(500).json({ message: 'Failed to update rating.' });
    }
};

// Delete a rating by ID
export const deleteRatingByTarget = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userDb = req.userDb;
        if (!userDb) {
            res.status(401).json({ message: 'User unauthorized' });
            return;
        }

        const rater = new Types.ObjectId(String(userDb._id));
        const { targetType, targetId } = req.query;

        if (!targetType || !targetId || typeof targetType !== 'string' || typeof targetId !== 'string') {
            res.status(400).json({ message: 'targetType and targetId are required.' });
            return
        }

        // Find and delete the rating
        const rating = await ratingModel.findOneAndDelete({ rater, targetType, targetId });
        if (!rating) {
            res.status(404).json({ message: 'Rating not found for this target by the current user.' });
            return
        }

        let userToUpdate: Types.ObjectId | null = null;

        if (targetType === 'Post') {
            const post = await postModel.findById(targetId);
            if (post) {
                userToUpdate = post.author;

                // Remove rater from post.likes
                if (post.likes) {
                    post.likes = post.likes.filter(id => id.toString() !== rater.toString());
                    await post.save();
                }

                // Remove post ID from user's likedPosts
                if (userDb.likedPosts) {
                    userDb.likedPosts = userDb.likedPosts.filter(id => id.toString() !== post._id.toString());
                    await userDb.save();
                }
            }
        } else if (targetType === 'Comment') {
            const comment = await commentModel.findById(targetId);
            if (comment) {
                userToUpdate = comment.author;

                // Remove rater from comment.likes
                if (comment.likes) {
                    comment.likes = comment.likes.filter(id => id.toString() !== rater.toString());
                    await comment.save();
                }

                // Remove comment ID from user's likedComments
                if (userDb.likedComments) {
                    userDb.likedComments = userDb.likedComments.filter(id => id.toString() !== comment._id.toString());
                    await userDb.save();
                }
            }
        } else if (targetType === 'User') {
            userToUpdate = new Types.ObjectId(targetId); // no like fields to update
        }

        if (userToUpdate) {
            await recalculateUserRating(userToUpdate);
        }

        res.status(200).json({ message: 'Rating deleted successfully.' });
    } catch (error) {
        console.error('Error deleting rating:', error);
        res.status(500).json({ message: 'Failed to delete rating.' });
    }
};


// Get top 10 rated targets across the app
export const getTop10Ratings = async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const topUsers = await userModel.find({ 'ratingStats.totalRatings': { $gt: 0 } })
            .sort({ 'ratingStats.averageScore': -1, 'ratingStats.totalRatings': -1 })
            .limit(10)
            .select('username profileImage ratingStats');

        res.status(200).json(topUsers);
    } catch (error) {
        console.error('Error fetching top rated users:', error);
        res.status(500).json({ message: 'Failed to fetch top rated users' });
    }
};


