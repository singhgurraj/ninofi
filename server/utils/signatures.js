"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSignaturesToContract = exports.renderSignaturesSection = exports.applySignature = exports.buildCenteredNameLine = void 0;
function buildCenteredNameLine(nameOrUndefined, totalLength = 28, minPadding = 3) {
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
exports.buildCenteredNameLine = buildCenteredNameLine;
function applySignature(prev, role, signerName) {
    if (role === 'homeowner') {
        return { ...prev, homeownerName: signerName };
    }
    return { ...prev, contractorName: signerName };
}
exports.applySignature = applySignature;
function renderSignaturesSection(state) {
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
exports.renderSignaturesSection = renderSignaturesSection;
exports.SIGNATURE_SECTION_LINE_COUNT = renderSignaturesSection({}).split('\n').length;
function attachSignaturesToContract(contractMarkdown, state) {
    return contractMarkdown.trimEnd() + '\n\n**Signatures**\n\n' + renderSignaturesSection(state);
}
exports.attachSignaturesToContract = attachSignaturesToContract;
const emptyState = {};
const afterContractor = applySignature(emptyState, 'contractor', 'Kunal');
console.log(renderSignaturesSection(afterContractor));
const afterHomeowner = applySignature(afterContractor, 'homeowner', 'Alice');
console.log(renderSignaturesSection(afterHomeowner));
