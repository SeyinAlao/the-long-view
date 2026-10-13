import { Equals } from 'class-validator';

// Publishing is permanent, so the author confirms what it means each
// time, on the form and here (ADR 014), not only by clicking a button.
export class PublishThesisDto {
  @Equals(true, {
    message:
      "Confirm that this is your own opinion, not investment advice, and that a published thesis can't be edited or deleted.",
  })
  confirmed!: boolean;
}
