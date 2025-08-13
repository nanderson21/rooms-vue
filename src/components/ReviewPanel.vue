<template>
  <div class="review-panel">
    <div class="review-header">
      <h3 class="review-title">
        <font-awesome-icon :icon="['fas', 'clipboard-check']" />
        Review & Approval
      </h3>
      <button 
        v-if="!isReviewing" 
        @click="startReview" 
        class="btn-primary"
      >
        Start Review
      </button>
    </div>

    <!-- Current Review Status -->
    <div v-if="currentReview" class="current-status">
      <div class="status-badge" :class="statusClass">
        <font-awesome-icon :icon="statusIcon" />
        {{ statusLabel }}
      </div>
      <div class="review-meta">
        <span class="reviewer">{{ currentReview.reviewer_name }}</span>
        <span class="review-date">{{ formatDate(currentReview.created_at) }}</span>
      </div>
      <div v-if="currentReview.comments" class="review-comments">
        <p>{{ currentReview.comments }}</p>
      </div>
    </div>

    <!-- Review Form -->
    <div v-if="isReviewing" class="review-form">
      <div class="form-group">
        <label>Review Decision</label>
        <div class="review-actions">
          <button 
            @click="setReviewStatus('approved')"
            class="review-btn approve"
            :class="{ selected: reviewForm.status === 'approved' }"
          >
            <font-awesome-icon :icon="['fas', 'check-circle']" />
            Approve
          </button>
          <button 
            @click="setReviewStatus('needs_changes')"
            class="review-btn changes"
            :class="{ selected: reviewForm.status === 'needs_changes' }"
          >
            <font-awesome-icon :icon="['fas', 'exclamation-circle']" />
            Needs Changes
          </button>
          <button 
            @click="setReviewStatus('rejected')"
            class="review-btn reject"
            :class="{ selected: reviewForm.status === 'rejected' }"
          >
            <font-awesome-icon :icon="['fas', 'times-circle']" />
            Reject
          </button>
        </div>
      </div>

      <div class="form-group">
        <label for="review-comments">Comments</label>
        <textarea
          id="review-comments"
          v-model="reviewForm.comments"
          placeholder="Add review comments..."
          rows="4"
          class="form-control"
          :required="reviewForm.status === 'needs_changes' || reviewForm.status === 'rejected'"
        ></textarea>
      </div>

      <div class="form-actions">
        <button @click="submitReview" class="btn-primary" :disabled="!canSubmit">
          Submit Review
        </button>
        <button @click="cancelReview" class="btn-secondary">
          Cancel
        </button>
      </div>
    </div>

    <!-- Approval History -->
    <div v-if="approvalHistory.length > 0" class="approval-history">
      <h4>Review History</h4>
      <div class="history-timeline">
        <div 
          v-for="entry in approvalHistory" 
          :key="entry.id"
          class="history-entry"
        >
          <div class="history-marker" :class="`status-${entry.action}`"></div>
          <div class="history-content">
            <div class="history-header">
              <span class="history-action">{{ formatAction(entry.action) }}</span>
              <span class="history-actor">by {{ entry.actor_name }}</span>
            </div>
            <div class="history-time">{{ formatDate(entry.created_at) }}</div>
            <div v-if="entry.comments" class="history-comments">
              {{ entry.comments }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import roomDatabase from '@/services/roomDatabaseEnhanced.js';

export default {
  name: 'ReviewPanel',
  
  props: {
    fileId: {
      type: String,
      required: true
    }
  },

  emits: ['review-submitted', 'status-changed'],

  setup(props, { emit }) {
    const currentReview = ref(null);
    const approvalHistory = ref([]);
    const isReviewing = ref(false);
    const reviewForm = ref({
      status: '',
      comments: ''
    });

    // Computed properties
    const statusClass = computed(() => {
      if (!currentReview.value) return '';
      return `status-${currentReview.value.status}`;
    });

    const statusIcon = computed(() => {
      if (!currentReview.value) return ['fas', 'question-circle'];
      
      const icons = {
        pending: ['fas', 'clock'],
        approved: ['fas', 'check-circle'],
        rejected: ['fas', 'times-circle'],
        needs_changes: ['fas', 'exclamation-circle']
      };
      
      return icons[currentReview.value.status] || ['fas', 'question-circle'];
    });

    const statusLabel = computed(() => {
      if (!currentReview.value) return 'Not Reviewed';
      
      const labels = {
        pending: 'Pending Review',
        approved: 'Approved',
        rejected: 'Rejected',
        needs_changes: 'Needs Changes'
      };
      
      return labels[currentReview.value.status] || currentReview.value.status;
    });

    const canSubmit = computed(() => {
      if (!reviewForm.value.status) return false;
      
      // Comments required for rejection or needs changes
      if (reviewForm.value.status === 'rejected' || reviewForm.value.status === 'needs_changes') {
        return reviewForm.value.comments.trim().length > 0;
      }
      
      return true;
    });

    // Methods
    const loadReviewData = async () => {
      try {
        // Get latest review for this file
        const stmt = roomDatabase.db.prepare(`
          SELECT * FROM reviews 
          WHERE file_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `);
        
        const result = stmt.get([props.fileId]);
        stmt.free();
        
        if (result) {
          currentReview.value = result;
        }

        // Get approval history
        approvalHistory.value = await roomDatabase.getApprovalHistory(props.fileId);
      } catch (error) {
        console.error('Error loading review data:', error);
      }
    };

    const startReview = () => {
      isReviewing.value = true;
      reviewForm.value = {
        status: currentReview.value?.status || '',
        comments: ''
      };
    };

    const cancelReview = () => {
      isReviewing.value = false;
      reviewForm.value = {
        status: '',
        comments: ''
      };
    };

    const setReviewStatus = (status) => {
      reviewForm.value.status = status;
    };

    const submitReview = async () => {
      if (!canSubmit.value) return;

      try {
        const reviewData = {
          reviewerId: 'current-user', // TODO: Get from auth context
          reviewerName: 'Current User', // TODO: Get from auth context
          status: reviewForm.value.status,
          comments: reviewForm.value.comments
        };

        if (currentReview.value) {
          // Update existing review
          await roomDatabase.updateReviewStatus(
            currentReview.value.id,
            reviewForm.value.status,
            reviewForm.value.comments
          );
        } else {
          // Create new review
          await roomDatabase.createReview(props.fileId, reviewData);
        }

        // Reload data
        await loadReviewData();
        
        // Reset form
        isReviewing.value = false;
        reviewForm.value = {
          status: '',
          comments: ''
        };

        // Emit events
        emit('review-submitted', {
          fileId: props.fileId,
          status: reviewData.status,
          comments: reviewData.comments
        });
        
        emit('status-changed', reviewData.status);
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review. Please try again.');
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const formatAction = (action) => {
      const actions = {
        pending: 'Marked as Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        needs_changes: 'Requested Changes'
      };
      return actions[action] || action;
    };

    // Initialize
    onMounted(async () => {
      await roomDatabase.initialize();
      await loadReviewData();
    });

    return {
      currentReview,
      approvalHistory,
      isReviewing,
      reviewForm,
      statusClass,
      statusIcon,
      statusLabel,
      canSubmit,
      startReview,
      cancelReview,
      setReviewStatus,
      submitReview,
      formatDate,
      formatAction
    };
  }
};
</script>

<style scoped>
.review-panel {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.review-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-status {
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-needs_changes {
  background: #fed7aa;
  color: #9a3412;
}

.review-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.review-comments {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.review-comments p {
  margin: 0;
  color: #374151;
}

.review-form {
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.review-actions {
  display: flex;
  gap: 0.75rem;
}

.review-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
}

.review-btn:hover {
  background: #f9fafb;
}

.review-btn.selected {
  background: #f3f4f6;
  border-color: currentColor;
}

.review-btn.approve {
  color: #059669;
}

.review-btn.approve.selected {
  border-color: #059669;
  background: #ecfdf5;
}

.review-btn.changes {
  color: #d97706;
}

.review-btn.changes.selected {
  border-color: #d97706;
  background: #fef3c7;
}

.review-btn.reject {
  color: #dc2626;
}

.review-btn.reject.selected {
  border-color: #dc2626;
  background: #fee2e2;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.approval-history {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.approval-history h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
}

.history-timeline {
  position: relative;
  padding-left: 1.5rem;
}

.history-timeline::before {
  content: '';
  position: absolute;
  left: 0.375rem;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 2px;
  background: #e5e7eb;
}

.history-entry {
  position: relative;
  margin-bottom: 1.25rem;
}

.history-marker {
  position: absolute;
  left: -1.125rem;
  top: 0.25rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
}

.history-marker.status-approved {
  border-color: #10b981;
  background: #10b981;
}

.history-marker.status-rejected {
  border-color: #ef4444;
  background: #ef4444;
}

.history-marker.status-needs_changes {
  border-color: #f59e0b;
  background: #f59e0b;
}

.history-content {
  font-size: 0.875rem;
}

.history-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.25rem;
}

.history-action {
  font-weight: 500;
  color: #111827;
}

.history-actor {
  color: #6b7280;
}

.history-time {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.history-comments {
  color: #4b5563;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.25rem;
  margin-top: 0.5rem;
}
</style>