/**
 * ADDING A NEW FORM — Master Spreadsheet Guide
 * ===============================================
 *
 * The Aangan Trust Portal works directly with 3 Master Sheets in Google Sheets:
 * 1. Location-List   (Master location hierarchy)
 * 2. Dropdown-List   (Master dropdown options)
 * 3. Forms-Details   (Form Registry)
 *
 * To add a new form:
 *
 * 1. Add a row to `Forms-Details` in your Master Google Sheet:
 *    - Form ID: FORM-002
 *    - Form Title: School Safety Audit Form
 *    - Status: Active
 *    - Priority: 2
 *    - New Form: Yes
 *    - Form Folder: FORM-002
 *    - Response Sheet: FORM-002 : Response
 *    - Response Folder: (optional Drive folder ID)
 *
 * 2. If the form uses custom dropdown options, add rows to `Dropdown-List`:
 *    - Form ID: FORM-002
 *    - Field Name: audit_type
 *    - Option Value: quarterly
 *    - Display Name: Quarterly Review
 *    - Sort Order: 1
 *    - Status: Active
 *
 * 3. Create the form folder in the codebase:
 *    `backend/forms/FORM-002/`
 *
 * 4. Create `config.json` inside `backend/forms/FORM-002/`:
 *    {
 *      "id": "FORM-002",
 *      "title": "School Safety Audit Form",
 *      "description": "Quarterly school safety assessment",
 *      "enabled": true,
 *      "priority": 2,
 *      "version": 1,
 *      "createdAt": "2026-08-20T00:00:00.000Z",
 *      "updatedAt": "2026-08-20T00:00:00.000Z",
 *      "responseSheetName": "FORM-002 : Response"
 *    }
 *
 * 5. Create `fields.json` inside `backend/forms/FORM-002/`:
 *    [
 *      {
 *        "id": "schoolId",
 *        "label": "School Safety ID",
 *        "type": "text",
 *        "required": true,
 *        "dynamicSource": {
 *          "type": "location",
 *          "locationKey": "schoolSafetyId"
 *        }
 *      },
 *      {
 *        "id": "auditType",
 *        "label": "Audit Type",
 *        "type": "select",
 *        "required": true,
 *        "dynamicSource": {
 *          "type": "dropdown",
 *          "fieldName": "audit_type"
 *        }
 *      }
 *    ]
 *
 * 6. The portal will automatically discover and display the new form card.
 *    On first submission, `<FORM ID> : Response` tab will be auto-created in Google Sheets
 *    with Col A = ID, Col B = Timestamp, Col C+ = Form Fields.
 */
