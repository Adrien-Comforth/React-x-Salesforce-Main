import { useId, useState, type FormEvent, type HTMLAttributes } from 'react';
import {
  createContact,
  toFormValues,
  updateContact,
  type Contact,
  type ContactFormValues,
} from '../../api/contacts';
import {
  CONTACT_FORM_FIELDS,
  type ContactFormField,
  type FieldErrors,
} from '../../api/contactErrors';
import { Button } from '../ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { ErrorBanner } from './ErrorBanner';

interface FieldConfig {
  label: string;
  type: 'text' | 'tel';
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete: string;
  required?: boolean;
}

// Only Last Name is checked in the browser. Email is type="text" (not "email"),
// no field has maxLength and the form is noValidate, so format and length
// errors come back from Salesforce.
const FIELD_CONFIG: Record<ContactFormField, FieldConfig> = {
  FirstName: { label: 'First Name', type: 'text', autoComplete: 'given-name' },
  LastName: {
    label: 'Last Name',
    type: 'text',
    autoComplete: 'family-name',
    required: true,
  },
  Title: { label: 'Title', type: 'text', autoComplete: 'organization-title' },
  Email: {
    label: 'Email',
    type: 'text',
    inputMode: 'email',
    autoComplete: 'email',
  },
  Phone: { label: 'Phone', type: 'tel', autoComplete: 'tel' },
};

export const LAST_NAME_REQUIRED = 'Last Name is required.';

export interface ContactSavedResult {
  mode: 'create' | 'edit';
  name: string;
}

interface ContactFormProps {
  /** The contact to edit, or null to create one. */
  contact: Contact | null;
  onSaved: (result: ContactSavedResult) => void;
  onCancel: () => void;
  /** Edit mode only: asks the parent to confirm and delete this contact. */
  onDeleteRequest?: (contact: Contact) => void;
}

/**
 * The create/edit form, rendered as the content of a Dialog. When a save fails,
 * the form stays open with the typed values: field errors show under their
 * field and every other error shows in the banner, so the user can retry.
 */
export function ContactForm({
  contact,
  onSaved,
  onCancel,
  onDeleteRequest,
}: ContactFormProps) {
  const idPrefix = useId();
  const [values, setValues] = useState<ContactFormValues>(() =>
    toFormValues(contact)
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = contact !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    setFormErrors([]);
    if (values.LastName.trim() === '') {
      setFieldErrors({ LastName: [LAST_NAME_REQUIRED] });
      return;
    }
    setFieldErrors({});
    setSaving(true);

    const outcome = contact
      ? await updateContact(contact.id, values)
      : await createContact(values);

    setSaving(false);
    if (outcome.ok) {
      onSaved({ mode: isEdit ? 'edit' : 'create', name: outcome.name });
      return;
    }
    setFieldErrors(outcome.fieldErrors);
    setFormErrors(outcome.formErrors);
  }

  // While a save is in flight, Escape and outside clicks must not close the dialog.
  const blockWhileSaving = (event: { preventDefault(): void }) => {
    if (saving) {
      event.preventDefault();
    }
  };

  return (
    <DialogContent
      className="sm:max-w-lg"
      showCloseButton={!saving}
      onEscapeKeyDown={blockWhileSaving}
      onInteractOutside={blockWhileSaving}
    >
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Contact' : 'New Contact'}</DialogTitle>
        <DialogDescription>Fields marked * are required.</DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        aria-busy={saving}
      >
        <ErrorBanner
          title="Salesforce couldn't save this contact."
          messages={formErrors}
        />
        <FieldGroup className="gap-4">
          {CONTACT_FORM_FIELDS.map(field => {
            const config = FIELD_CONFIG[field];
            const inputId = `${idPrefix}-${field}`;
            const errorId = `${inputId}-error`;
            const errors = fieldErrors[field] ?? [];
            const invalid = errors.length > 0;

            return (
              <Field key={field} data-invalid={invalid || undefined}>
                <FieldLabel htmlFor={inputId}>
                  {config.label}
                  {config.required && (
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  )}
                </FieldLabel>
                <Input
                  id={inputId}
                  name={field}
                  type={config.type}
                  inputMode={config.inputMode}
                  autoComplete={config.autoComplete}
                  value={values[field]}
                  onChange={event => {
                    const { value } = event.target;
                    setValues(previous => ({ ...previous, [field]: value }));
                  }}
                  aria-required={config.required || undefined}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? errorId : undefined}
                  disabled={saving}
                />
                <FieldError
                  id={errorId}
                  errors={errors.map(message => ({ message }))}
                />
              </Field>
            );
          })}
        </FieldGroup>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {contact && onDeleteRequest && (
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => onDeleteRequest(contact)}
            >
              Delete
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}
