'use client';

import type { GenerationResults, ProductFormValues } from '@/lib/types';

export const WORKFLOW_DRAFT_UPDATED_EVENT = 'mitty-workflow-draft-updated';

export const WORKFLOW_DRAFT_FILE_FIELDS = [
  'productImage',
  'openShirtImage',
  'fabricCloseupImage',
  'collarButtonCloseupImage',
  'pocketLogoDetailImage',
  'backSideImage',
  'productImageFront',
  'productImageFabric',
  'productImageBack',
  'bottleImageFile',
  'boxFrontImageFile',
  'boxBackImageFile',
] as const;

export type WorkflowDraftFileField = (typeof WORKFLOW_DRAFT_FILE_FIELDS)[number];

type FileBackedFormField = WorkflowDraftFileField;

export type ProductFormDraftValues = Partial<Omit<ProductFormValues, FileBackedFormField>>;

export type WorkflowDraftFile = {
  dataUri: string;
  name: string;
  type: string;
  lastModified: number;
};

export type WorkflowDraft = {
  formValues?: ProductFormDraftValues;
  files?: Partial<Record<WorkflowDraftFileField, WorkflowDraftFile>>;
  results?: GenerationResults | null;
  productImageUris?: Record<string, string>;
  updatedAt?: number;
};

const DB_NAME = 'mitty-virtual-studio-drafts';
const STORE_NAME = 'workflow';
const DRAFT_KEY = 'active-workflow';

const canUseIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window;

const openDraftDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open draft database.'));
  });

const readRecord = async <T>() => {
  const db = await openDraftDb();

  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DRAFT_KEY);

    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read draft.'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
};

const writeRecord = async (draft: WorkflowDraft) => {
  const db = await openDraftDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(draft, DRAFT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not save draft.'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
};

const dispatchDraftUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(WORKFLOW_DRAFT_UPDATED_EVENT));
  }
};

export const readWorkflowDraft = async () => {
  if (!canUseIndexedDb()) {
    return null;
  }

  try {
    return await readRecord<WorkflowDraft>();
  } catch {
    return null;
  }
};

export const writeWorkflowDraft = async (patch: WorkflowDraft) => {
  if (!canUseIndexedDb()) {
    return;
  }

  try {
    const current = (await readRecord<WorkflowDraft>()) ?? {};
    const next: WorkflowDraft = {
      ...current,
      ...patch,
      formValues: patch.formValues ? { ...current.formValues, ...patch.formValues } : current.formValues,
      files: patch.files ? { ...current.files, ...patch.files } : current.files,
      updatedAt: Date.now(),
    };

    await writeRecord(next);
    dispatchDraftUpdated();
  } catch {
    // Draft persistence is best-effort; the workflow should never fail because storage is full or blocked.
  }
};

export const saveWorkflowDraftFile = async (field: WorkflowDraftFileField, file: WorkflowDraftFile) => {
  await writeWorkflowDraft({ files: { [field]: file } });
};

export const removeWorkflowDraftFile = async (field: WorkflowDraftFileField) => {
  if (!canUseIndexedDb()) {
    return;
  }

  try {
    const current = (await readRecord<WorkflowDraft>()) ?? {};
    const nextFiles = { ...current.files };
    delete nextFiles[field];

    await writeRecord({
      ...current,
      files: nextFiles,
      updatedAt: Date.now(),
    });
    dispatchDraftUpdated();
  } catch {
    // Ignore draft cleanup failures.
  }
};

export const dataUriToFile = async (dataUri: string, name: string, type: string) => {
  const response = await fetch(dataUri);
  const blob = await response.blob();

  return new File([blob], name, {
    type: type || blob.type || 'image/jpeg',
    lastModified: Date.now(),
  });
};

export const getSerializableProductFormDraft = (values: ProductFormValues): ProductFormDraftValues => {
  const draftValues = { ...values };

  for (const field of WORKFLOW_DRAFT_FILE_FIELDS) {
    delete draftValues[field];
  }

  return draftValues as ProductFormDraftValues;
};
