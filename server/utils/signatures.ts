export type SignerRole = 'homeowner' | 'contractor';

export type SignatureState = {
  homeownerName?: string;
  contractorName?: string;
};

/**
 * Build an underscore line with an optional centered name.
 */
export function buildCenteredNameLine(
  nameOrUndefined: string | undefined,
  totalLength = 28,
  minPadding = 3
): string {
  if (nameOrUndefined === undefined) {
    return '_'.repeat(totalLength);
  }

  const name = nameOrUndefined;
  const available = totalLength - name.length;
  if (available < 2 * minPadding) {
    return '_'.repeat(minPadding) + name + '_'.repeat(minPadding);
  }

  const left = Math.floor(available / 2);
  const right = available - left;
  return '_'.repeat(left) + name + '_'.repeat(right);
}

/**
 * Apply a signature to state immutably.
 */
export function applySignature(
  prev: SignatureState,
  role: SignerRole,
  signerName: string
): SignatureState {
  if (role === 'homeowner') {
    return { ...prev, homeownerName: signerName };
  }
  return { ...prev, contractorName: signerName };
}

/**
 * Render the signatures section as markdown.
 */
export function renderSignaturesSection(state: SignatureState): string {
  return [
    buildCenteredNameLine(state.homeownerName),
    'Homeowner Signature',
    '',
    buildCenteredNameLine(state.homeownerName),
    'Printed Name of Homeowner',
    '',
    buildCenteredNameLine(state.contractorName),
    'Contractor Signature',
    '',
    buildCenteredNameLine(state.contractorName),
    'Printed Name of Contractor',
  ].join('\n');
}

export const SIGNATURE_SECTION_LINE_COUNT = renderSignaturesSection({}).split('\n').length;

/**
 * Optional helper to attach signatures to an existing contract body.
 */
export function attachSignaturesToContract(
  contractMarkdown: string,
  state: SignatureState
): string {
  return contractMarkdown.trimEnd() + '\n\n**Signatures**\n\n' + renderSignaturesSection(state);
}

// Demo
const emptyState: SignatureState = {};
const afterContractor = applySignature(emptyState, 'contractor', 'Kunal');
// eslint-disable-next-line no-console
console.log(renderSignaturesSection(afterContractor));

const afterHomeowner = applySignature(afterContractor, 'homeowner', 'Alice');
// eslint-disable-next-line no-console
console.log(renderSignaturesSection(afterHomeowner));
