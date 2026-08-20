/**
 * AANGAN TRUST DATA COLLECTION PORTAL — GOOGLE APPS SCRIPT
 * =========================================================
 * 
 * ARCHITECTURE OVERVIEW:
 * 
 * 1. Master Google Spreadsheet (Contains ONLY 3 Master Sheets — NO response tabs):
 *    - Location-List   -> Master location hierarchy
 *    - Dropdown-List   -> Master dropdown options
 *    - Forms-Details   -> Form Registry
 * 
 * 2. Central Google Drive Response Storage:
 *    - Root Folder ID: 1i16FLqDEkSjfv2U6UPejd5DClrOdCJh1 (Aangan Trust Forms Response)
 *    - Each Form gets a dedicated folder: `<FormTitle>_ Response_<FormID>`
 *    - Each Form gets its own Response Spreadsheet: `<FormTitle>_ Response`
 *    - Each Attachment Field gets its own sub-folder: `<Field Name>/`
 *    - Response Sheet Column Structure:
 *      Col A: Form ID | Col B: ID | Col C: Timestamp | Col D+: Configured Form Fields
 * 
 * 3. File Uploads:
 *    - Files uploaded directly to the field's Drive folder.
 *    - Spreadsheet stores the Google Drive file URL/link.
 */

// Central root Drive folder ID for all form responses
var ROOT_RESPONSE_FOLDER_ID = "1i16FLqDEkSjfv2U6UPejd5DClrOdCJh1";

// Master Spreadsheet ID (leave blank if script is container-bound to the Master Spreadsheet)
var MASTER_SPREADSHEET_ID = "";

var MASTER_SHEET_NAMES = {
  LOCATION: "Location-List",
  DROPDOWN: "Dropdown-List",
  FORMS_DETAILS: "Forms-Details"
};

/**
 * Returns the Master Spreadsheet (contains ONLY master data)
 */
function getMasterSpreadsheet(sheetId) {
  var id = sheetId || MASTER_SPREADSHEET_ID;
  if (id && id.trim() !== "") {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Returns the central Root Drive Folder
 */
function getRootResponseFolder() {
  if (!ROOT_RESPONSE_FOLDER_ID || ROOT_RESPONSE_FOLDER_ID.trim() === "") {
    throw new Error("ROOT_RESPONSE_FOLDER_ID is not configured in Apps Script.");
  }
  return DriveApp.getFolderById(ROOT_RESPONSE_FOLDER_ID);
}

/**
 * Helper to build JSON responses
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Generates collision-safe Unique Response ID
 * Format: RESP-<CLEAN_FORM_ID>-<YYYYMMDDHHMMSS>-<RANDOM>
 */
function generateResponseId(formId) {
  var cleanId = (formId || "FORM").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  var timestamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyyMMddHHmmss");
  var randomSuffix = ("000" + Math.floor(Math.random() * 10000)).slice(-4);
  return "RESP-" + cleanId + "-" + timestamp + "-" + randomSuffix;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP HANDLERS (doGet / doPost)
// ─────────────────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var params = e ? e.parameter || {} : {};
    var action = params.action;
    var masterSS = getMasterSpreadsheet(params.sheetId);

    switch (action) {
      case "getFormsRegistry":
        return getFormsRegistry(masterSS);

      case "getDropdownList":
        return getDropdownList(masterSS, params.formId, params.fieldName);

      case "getLocationList":
        return getLocationList(masterSS);

      case "getData":
        return getFormData(masterSS, params.formId);

      default:
        return createJsonResponse({
          success: true,
          message: "Aangan Trust Data Portal API (Drive Folder Response Storage) is active.",
          rootFolderId: ROOT_RESPONSE_FOLDER_ID,
          actions: ["getFormsRegistry", "getDropdownList", "getLocationList", "getData", "submit"]
        });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var postData = "";
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      postData = e && e.parameter ? e.parameter : {};
    }

    var action = postData.action || (e && e.parameter ? e.parameter.action : "submit");
    var masterSS = getMasterSpreadsheet(postData.sheetId || (e && e.parameter ? e.parameter.sheetId : ""));

    switch (action) {
      case "submit":
        return handleFormSubmit(masterSS, postData);

      case "updateRow":
        return handleUpdateRow(masterSS, postData);

      default:
        return createJsonResponse({ success: false, error: "Invalid POST action: " + action });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MASTER SHEET READERS (Location-List, Dropdown-List, Forms-Details)
// ─────────────────────────────────────────────────────────────────────────────

function getFormsRegistry(ss) {
  var sheet = ss.getSheetByName(MASTER_SHEET_NAMES.FORMS_DETAILS);
  if (!sheet) {
    return createJsonResponse({ success: false, error: "Sheet '" + MASTER_SHEET_NAMES.FORMS_DETAILS + "' not found." });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ success: true, forms: [] });
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var forms = [];

  function parseBooleanOrYes(val) {
    if (val === true) return true;
    if (typeof val === "string") {
      var clean = val.trim().toLowerCase();
      return clean === "yes" || clean === "true" || clean === "1";
    }
    if (typeof val === "number") return val === 1;
    return false;
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;

    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = headers[j].toLowerCase().replace(/\s+/g, "");
      item[headerKey] = row[j];
    }

    var isPriority = parseBooleanOrYes(item.priority !== undefined ? item.priority : row[3]);
    var isNewForm = parseBooleanOrYes(item.newform !== undefined ? item.newform : row[4]);

    forms.push({
      formId: String(item.formid || row[0] || "").trim(),
      formTitle: String(item.formtitle || row[1] || "").trim(),
      status: String(item.status || row[2] || "Active").trim(),
      priority: isPriority ? "Yes" : "No",
      isPriority: isPriority,
      newForm: isNewForm ? "Yes" : "No",
      isNew: isNewForm,
      formFolder: String(item.formfolder || row[5] || "").trim(),
      responseSheet: String(item.responsesheet || row[6] || "").trim(),
      responseFolder: String(item.responsefolder || row[7] || "").trim()
    });
  }

  return createJsonResponse({ success: true, forms: forms });
}

function getDropdownList(ss, filterFormId, filterFieldName) {
  var sheet = ss.getSheetByName(MASTER_SHEET_NAMES.DROPDOWN);
  if (!sheet) {
    return createJsonResponse({ success: false, error: "Sheet '" + MASTER_SHEET_NAMES.DROPDOWN + "' not found." });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ success: true, options: [] });
  }

  var options = [];
  var targetFormId = (filterFormId || "").trim().toUpperCase();
  var targetFieldName = (filterFieldName || "").trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowFormId = String(row[0] || "").trim().toUpperCase();
    var rowFieldName = String(row[1] || "").trim().toLowerCase();
    var rowStatus = String(row[5] || "").trim().toLowerCase();

    if (rowStatus !== "active" && rowStatus !== "enabled" && rowStatus !== "1" && rowStatus !== "true") {
      continue;
    }

    if (targetFormId && rowFormId && rowFormId !== targetFormId && rowFormId !== "ALL") {
      continue;
    }

    if (targetFieldName && rowFieldName && rowFieldName !== targetFieldName) {
      continue;
    }

    options.push({
      formId: String(row[0] || "").trim(),
      fieldName: String(row[1] || "").trim(),
      optionValue: String(row[2] !== undefined ? row[2] : ""),
      displayName: String(row[3] || row[2] || ""),
      sortOrder: Number(row[4] || 0),
      status: String(row[5] || "Active").trim()
    });
  }

  options.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  return createJsonResponse({ success: true, options: options });
}

function getLocationList(ss) {
  var sheet = ss.getSheetByName(MASTER_SHEET_NAMES.LOCATION);
  if (!sheet) {
    return createJsonResponse({ success: false, error: "Sheet '" + MASTER_SHEET_NAMES.LOCATION + "' not found." });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ success: true, locations: [] });
  }

  var locations = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1] && !row[2]) continue;

    locations.push({
      schoolSafetyId: String(row[0] || "").trim(),
      state: String(row[1] || "").trim(),
      district: String(row[2] || "").trim(),
      thaana: String(row[3] || "").trim(),
      block: String(row[4] || "").trim(),
      gp: String(row[5] || "").trim(),
      school: String(row[6] || "").trim(),
      assignedGsg: String(row[7] || "").trim(),
      responsiblePerson: String(row[8] || "").trim()
    });
  }

  return createJsonResponse({ success: true, locations: locations });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEDICATED DRIVE RESPONSE STORAGE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds or creates the form's dedicated response folder inside the root Drive folder.
 * Naming format: `<FormTitle>_ Response_<FormID>` (e.g. "GSG Monitoring Form_ Response_FORM-001")
 */
function getOrCreateFormResponseFolder(rootFolder, formId, formTitle) {
  var cleanId = String(formId || "FORM-001").trim();
  var title = String(formTitle || cleanId).trim();
  var folderName = title + "_ Response_" + cleanId;

  var folders = rootFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }

  // Also check if any existing folder ends with `_ Response_<cleanId>` to prevent renaming duplication
  var allFolders = rootFolder.getFolders();
  while (allFolders.hasNext()) {
    var f = allFolders.next();
    if (f.getName().indexOf("_ Response_" + cleanId) !== -1 || f.getName() === folderName) {
      return f;
    }
  }

  return rootFolder.createFolder(folderName);
}

/**
 * Finds or creates an attachment sub-folder inside the form's response folder.
 * Folder name is based on the Form Field Label / Name (e.g. "School Photo", "Supporting Document").
 */
function getOrCreateAttachmentFolder(formFolder, fieldLabelOrName) {
  var folderName = String(fieldLabelOrName || "Attachments").trim();
  var folders = formFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return formFolder.createFolder(folderName);
}

/**
 * Finds or creates the dedicated Form Response Google Spreadsheet inside the form's folder.
 * Spreadsheet Name: `<FormTitle>_ Response` (e.g. "GSG Monitoring Form_ Response")
 *
 * Headers in Row 1:
 * Col A: Form ID | Col B: ID | Col C: Timestamp | Col D+: Configured form fields in order
 */
function getOrCreateResponseSpreadsheet(formFolder, formTitle, formId, fields) {
  var cleanId = String(formId || "FORM-001").trim();
  var title = String(formTitle || cleanId).trim();
  var ssName = title + "_ Response";

  var files = formFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var targetFile = null;

  while (files.hasNext()) {
    var file = files.next();
    if (file.getName() === ssName || file.getName().indexOf("_ Response") !== -1) {
      targetFile = file;
      break;
    }
  }

  var ss = null;
  if (targetFile) {
    ss = SpreadsheetApp.openById(targetFile.getId());
  } else {
    // Create new Spreadsheet directly in Google Drive root, then move to formFolder
    var newSS = SpreadsheetApp.create(ssName);
    var fileInDrive = DriveApp.getFileById(newSS.getId());
    fileInDrive.moveTo(formFolder);
    ss = newSS;
  }

  var sheet = ss.getActiveSheet();
  sheet.setName("Responses");

  if (fields && Array.isArray(fields) && fields.length > 0) {
    var expectedHeaders = ["Form ID", "ID", "Timestamp"];
    for (var k = 0; k < fields.length; k++) {
      var f = fields[k];
      var headerName = typeof f === "object" ? (f.label || f.id) : String(f);
      expectedHeaders.push(headerName);
    }

    var lastCol = sheet.getLastColumn();
    var shouldUpdateHeaders = !targetFile || lastCol < expectedHeaders.length;

    if (shouldUpdateHeaders) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      var headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#F3F4F6");
      sheet.setFrozenRows(1);
    }
  }

  return ss;
}

/**
 * Handles file attachments by uploading to the dedicated attachment field folder
 * Returns the Google Drive file URL/link.
 */
function processAttachmentUpload(formFolder, fieldLabelOrName, filePayload) {
  if (!filePayload) return "";

  // If already a URL string, return directly
  if (typeof filePayload === "string") {
    if (filePayload.startsWith("http://") || filePayload.startsWith("https://")) {
      return filePayload;
    }
  }

  try {
    var folder = getOrCreateAttachmentFolder(formFolder, fieldLabelOrName);
    var fileName = filePayload.name || ("photo_" + Date.now() + ".jpg");
    var mimeType = filePayload.type || "image/jpeg";
    var base64Data = filePayload.base64 || (typeof filePayload === "string" ? filePayload : "");

    if (!base64Data) return "";

    // Clean base64 data URI prefix if present
    var cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    var driveFile = folder.createFile(blob);
    driveFile.setDescription("Uploaded via Aangan Trust Portal");

    try {
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Ignore domain restriction
    }

    return driveFile.getUrl();
  } catch (uploadErr) {
    Logger.log("Attachment upload error: " + uploadErr.toString());
    return "[Upload Error: " + uploadErr.toString() + "]";
  }
}

/**
 * Submits form response to the form's dedicated Google Spreadsheet & Drive folder
 */
function handleFormSubmit(masterSS, payload) {
  var formId = String(payload.formId || "").trim();
  if (!formId) {
    return createJsonResponse({ success: false, error: "Missing required parameter: formId" });
  }

  var formData = payload.data || {};
  var fields = payload.fields || [];
  var formTitle = String(payload.formTitle || formId).trim();

  // Try retrieving official Form Title from Forms-Details if not passed
  if (!payload.formTitle && masterSS) {
    var detailsSheet = masterSS.getSheetByName(MASTER_SHEET_NAMES.FORMS_DETAILS);
    if (detailsSheet) {
      var detailsData = detailsSheet.getDataRange().getValues();
      for (var r = 1; r < detailsData.length; r++) {
        if (String(detailsData[r][0]).trim().toUpperCase() === formId.toUpperCase()) {
          formTitle = String(detailsData[r][1]).trim() || formTitle;
          break;
        }
      }
    }
  }

  // 1. Get Central Root Drive Folder
  var rootFolder = getRootResponseFolder();

  // 2. Get or create Form Response Folder: `<FormTitle>_ Response_<FormID>`
  var formFolder = getOrCreateFormResponseFolder(rootFolder, formId, formTitle);

  // 3. Process File Attachments -> save to Drive sub-folders & replace value with Drive URL
  for (var key in formData) {
    var rawVal = formData[key];
    if (rawVal && (typeof rawVal === "object" && rawVal.base64)) {
      var fieldLabel = key;
      for (var f = 0; f < fields.length; f++) {
        if (typeof fields[f] === "object" && (fields[f].id === key || fields[f].label === key)) {
          fieldLabel = fields[f].label || key;
          break;
        }
      }
      var uploadedUrl = processAttachmentUpload(formFolder, fieldLabel, rawVal);
      formData[key] = uploadedUrl;
    }
  }

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var fieldId = typeof field === "object" ? field.id : String(field);
    var fieldLabel = typeof field === "object" ? (field.label || field.id) : String(field);
    var fieldType = typeof field === "object" ? (field.type || "") : "";

    var rawValue = formData[fieldId] !== undefined ? formData[fieldId] : formData[fieldLabel];

    if (rawValue && (fieldType === "file" || fieldType === "image" || fieldType === "attachment" || (typeof rawValue === "object" && rawValue.base64))) {
      if (typeof rawValue === "object" && rawValue.base64) {
        var fileUrl = processAttachmentUpload(formFolder, fieldLabel, rawValue);
        formData[fieldId] = fileUrl;
      }
    }
  }

  // 4. Get or create dedicated Form Response Spreadsheet: `<FormTitle>_ Response`
  var responseSS = getOrCreateResponseSpreadsheet(formFolder, formTitle, formId, fields);
  var responseSheet = responseSS.getActiveSheet();

  // 5. Read row 1 headers
  var headerValues = responseSheet.getRange(1, 1, 1, responseSheet.getLastColumn() || 3).getValues()[0];

  // 6. Generate collision-safe Response ID & IST Timestamp
  var responseId = generateResponseId(formId);
  var timestamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

  // 7. Map row values: Col A = Form ID, Col B = ID, Col C = Timestamp, Col D+ = Fields
  var rowValues = [formId, responseId, timestamp];

  for (var col = 3; col < headerValues.length; col++) {
    var header = String(headerValues[col]).trim();
    var val = "";

    // Match by field ID in fields array
    var matchedField = null;
    if (fields && Array.isArray(fields)) {
      for (var f = 0; f < fields.length; f++) {
        var item = fields[f];
        if (typeof item === "object" && (item.label === header || item.id === header)) {
          matchedField = item;
          break;
        }
      }
    }

    if (matchedField && formData[matchedField.id] !== undefined) {
      val = formData[matchedField.id];
    } else if (formData[header] !== undefined) {
      val = formData[header];
    } else {
      var headerLower = header.toLowerCase();
      for (var key in formData) {
        if (key.toLowerCase() === headerLower) {
          val = formData[key];
          break;
        }
      }
    }

    if (Array.isArray(val)) {
      val = val.join(", ");
    } else if (typeof val === "object" && val !== null) {
      val = JSON.stringify(val);
    }

    rowValues.push(val !== undefined && val !== null ? val : "");
  }

  // 8. Append to dedicated response spreadsheet
  responseSheet.appendRow(rowValues);
  var newRowIndex = responseSheet.getLastRow();

  return createJsonResponse({
    success: true,
    data: {
      formId: formId,
      id: responseId,
      timestamp: timestamp,
      rowNumber: newRowIndex,
      spreadsheetUrl: responseSS.getUrl(),
      folderUrl: formFolder.getUrl()
    }
  });
}

/**
 * Reads submitted response data from the form's dedicated response spreadsheet in Drive
 */
function getFormData(masterSS, formId) {
  var cleanId = String(formId || "").trim();
  if (!cleanId) {
    return createJsonResponse({ success: false, error: "Missing formId parameter" });
  }

  var rootFolder = getRootResponseFolder();

  // Find the form's dedicated folder
  var allFolders = rootFolder.getFolders();
  var formFolder = null;

  while (allFolders.hasNext()) {
    var f = allFolders.next();
    if (f.getName().indexOf("_ Response_" + cleanId) !== -1 || f.getName().indexOf(cleanId) !== -1) {
      formFolder = f;
      break;
    }
  }

  if (!formFolder) {
    return createJsonResponse({ success: true, rows: [], total: 0, headers: [] });
  }

  // Find the response spreadsheet
  var files = formFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  if (!files.hasNext()) {
    return createJsonResponse({ success: true, rows: [], total: 0, headers: [] });
  }

  var responseFile = files.next();
  var responseSS = SpreadsheetApp.openById(responseFile.getId());
  var sheet = responseSS.getActiveSheet();

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ success: true, rows: [], total: 0, headers: [] });
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowFormId = String(row[0] || cleanId);
    var responseId = String(row[1] || "");
    var submittedAt = String(row[2] || "");

    var fieldData = {};
    for (var col = 3; col < headers.length; col++) {
      var headerKey = headers[col];
      fieldData[headerKey] = row[col];
    }

    rows.push({
      id: responseId,
      formId: rowFormId,
      submittedAt: submittedAt,
      data: fieldData
    });
  }

  rows.reverse();

  return createJsonResponse({
    success: true,
    rows: rows,
    total: rows.length,
    headers: headers,
    spreadsheetUrl: responseSS.getUrl()
  });
}

function handleUpdateRow(masterSS, payload) {
  var formId = String(payload.formId || "").trim();
  var rowId = String(payload.rowId || "").trim();
  var updatedData = payload.data || {};

  if (!formId || !rowId) {
    return createJsonResponse({ success: false, error: "Missing formId or rowId" });
  }

  var rootFolder = getRootResponseFolder();
  var allFolders = rootFolder.getFolders();
  var formFolder = null;

  while (allFolders.hasNext()) {
    var f = allFolders.next();
    if (f.getName().indexOf("_ Response_" + formId) !== -1 || f.getName().indexOf(formId) !== -1) {
      formFolder = f;
      break;
    }
  }

  if (!formFolder) {
    return createJsonResponse({ success: false, error: "Response folder for " + formId + " not found." });
  }

  var files = formFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  if (!files.hasNext()) {
    return createJsonResponse({ success: false, error: "Response spreadsheet for " + formId + " not found." });
  }

  var responseSS = SpreadsheetApp.openById(files.next().getId());
  var sheet = responseSS.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });

  var targetRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === rowId) { // Col B is ID
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex === -1) {
    return createJsonResponse({ success: false, error: "Response ID '" + rowId + "' not found." });
  }

  for (var col = 3; col < headers.length; col++) {
    var colHeader = headers[col];
    if (updatedData[colHeader] !== undefined) {
      sheet.getRange(targetRowIndex, col + 1).setValue(updatedData[colHeader]);
    }
  }

  return createJsonResponse({ success: true, message: "Row updated successfully." });
}
