
'use client';
import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Flag, MoreHorizontal } from 'lucide-react';
import type { Club, Expense, ExpenseStatus, User } from '@/lib/types';
import { StatusBadge } from './status-badge';
import { format } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';

interface ExpenseTableProps {
  expenses: Expense[];
  clubs: Club[];
  users?: User[];
}

export function ExpenseTable({ expenses, clubs, users = [] }: ExpenseTableProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [comment, setComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { role } = useUser();
  const { toast } = useToast();

  const getClubName = (expense: Expense) => {
    if (expense.clubName) return expense.clubName;
    return clubs.find((c) => c.id === expense.clubId)?.name || 'Unknown Club';
  };

  const getSubmitterName = (expense: Expense) => {
    if (expense.submitterName) return expense.submitterName;
    return users.find(u => u.id === expense.submitterId)?.name || expense.submitterId;
  }

  const handleStatusChange = async (
    expenseId: string,
    status: ExpenseStatus
  ) => {
    const expenseRef = doc(db, 'expenses', expenseId);
    try {
      await updateDoc(expenseRef, { status });
      toast({
        title: 'Status Updated',
        description: `Expense has been marked as ${status}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the expense status.',
      });
    }
  };

  const handleFlagExpense = async (expenseId: string) => {
    const expenseRef = doc(db, 'expenses', expenseId);
    try {
      await updateDoc(expenseRef, { isFlagged: true });
      toast({
        title: 'Expense Flagged',
        description: 'This expense has been flagged for admin review.',
      });
    } catch (error) {
      console.error('Error flagging expense:', error);
      toast({
        variant: 'destructive',
        title: 'Flagging Failed',
        description: 'Could not flag the expense.',
      });
    }
  };

  const handleToggleExpand = (expenseId: string, currentComment?: string) => {
    if (expandedId === expenseId) {
      setExpandedId(null);
      setComment('');
    } else {
      setExpandedId(expenseId);
      setComment(currentComment || '');
    }
  };

  const handleCommentSubmit = async (expenseId: string) => {
    if (!comment) {
      toast({
        variant: 'destructive',
        title: 'Comment is empty',
        description: 'Please enter a comment before submitting.',
      });
      return;
    }
    setIsSubmitting(true);
    const expenseRef = doc(db, 'expenses', expenseId);
    try {
      await updateDoc(expenseRef, { adminComment: comment });
      toast({
        title: 'Comment Saved!',
        description: 'Your comment has been added to the expense.',
      });
      setComment('');
      setExpandedId(null); // Collapse after submitting
    } catch (error) {
      console.error('Error saving comment: ', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your comment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPerformActions = role === 'admin' || role === 'representative';
  const showSubmitter = role === 'admin' || role === 'representative';
  const numColumns = showSubmitter ? (canPerformActions ? 7 : 6) : 5;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Club</TableHead>
            {showSubmitter && <TableHead>Submitter</TableHead>}
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            {canPerformActions && (
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <React.Fragment key={expense.id}>
              <TableRow
                onClick={() => handleToggleExpand(expense.id, expense.adminComment)}
                className={cn(
                  'cursor-pointer',
                  expandedId === expense.id && 'bg-muted/50'
                )}
              >
                <TableCell className="font-medium">
                  {getClubName(expense)}
                </TableCell>
                {showSubmitter && <TableCell>{getSubmitterName(expense)}</TableCell>}
                <TableCell className="flex items-center gap-2">
                    {expense.isFlagged && role === 'admin' && <Flag className="h-4 w-4 text-destructive" title="Flagged as fraudulent"/>}
                    {expense.description}
                </TableCell>
                <TableCell className="text-right">
                  ${expense.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {format(new Date(expense.submittedDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <StatusBadge status={expense.status} />
                </TableCell>
                {canPerformActions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {role === 'admin' && (
                            <>
                                <DropdownMenuItem
                                onClick={() =>
                                    handleStatusChange(expense.id, 'Approved')
                                }
                                >
                                Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                onClick={() =>
                                    handleStatusChange(expense.id, 'Rejected')
                                }
                                >
                                Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                onClick={() =>
                                    handleStatusChange(expense.id, 'Under Review')
                                }
                                >
                                Mark as 'Under Review'
                                </DropdownMenuItem>
                            </>
                        )}
                        {role === 'representative' && (
                            <>
                                <DropdownMenuItem onClick={() => handleFlagExpense(expense.id)}>
                                    <Flag className="mr-2 h-4 w-4" />
                                    Flag Expense
                                </DropdownMenuItem>
                            </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
              {expandedId === expense.id && (
                <TableRow>
                  <TableCell colSpan={numColumns} className="bg-muted/50 p-4">
                    {role === 'admin' ? (
                       <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Review Expense & Add Comment</h4>
                         <Textarea
                           id={`comment-${expense.id}`}
                           placeholder="Leave a comment for the submitter..."
                           value={comment}
                           onChange={(e) => setComment(e.target.value)}
                         />
                         <Button
                           size="sm"
                           onClick={() => handleCommentSubmit(expense.id)}
                           disabled={isSubmitting}
                         >
                           {isSubmitting ? 'Submitting...' : 'Submit Comment'}
                         </Button>
                       </div>
                    ) : (
                      expense.adminComment && (
                        <div className="text-sm">
                          <h4 className="font-semibold mb-1">Admin Comment</h4>
                          <p className="text-muted-foreground pl-2 border-l-2">
                            {expense.adminComment}
                          </p>
                        </div>
                      )
                    )}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
