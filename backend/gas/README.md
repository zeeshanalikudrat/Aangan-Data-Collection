# Aangan Trust — Form Response Storage & Master Spreadsheet Architecture

This document describes the complete architecture for master data references and dedicated Google Drive response storage.

---

## 1. Master Google Spreadsheet (ONLY 3 Master Sheets)

The Master Google Spreadsheet contains **ONLY** master reference data. **NO response tabs are ever created inside this spreadsheet.**

```
Master Google Spreadsheet
├── Location-List  (School Safety ID, State, District, Thaana, Block, GP, School, Assigned GSG, Responsible Person)
├── Dropdown-List  (Form ID, Field Name, Option Value, Display Name, Sort Order, Status)
└── Forms-Details  (Form ID, Form Title, Status, Priority, New Form, Form Folder, Response Sheet, Response Folder)
```

---

## 2. Central Google Drive Response Storage Architecture

All form responses and file attachments are stored inside the central Aangan Trust Google Drive root folder:

* **Root Folder ID**: `1i16FLqDEkSjfv2U6UPejd5DClrOdCJh1`
* **Root Folder Name**: `Aangan Trust Forms Response`

### Folder & File Hierarchy:

```
Aangan Trust Forms Response (Root Folder ID: 1i16FLqDEkSjfv2U6UPejd5DClrOdCJh1)
│
├── GSG Monitoring Form_ Response_FORM-001/          (Form Dedicated Folder)
│   ├── School Photo/                                (Attachment Field Folder 1)
│   ├── Supporting Document/                         (Attachment Field Folder 2)
│   └── GSG Monitoring Form_ Response                (Form Dedicated Google Spreadsheet)
│       └── [Responses Tab]
│
├── Field Visit Form_ Response_FORM-002/             (Form Dedicated Folder)
│   ├── Site Photo/                                  (Attachment Field Folder)
│   └── Field Visit Form_ Response                   (Form Dedicated Google Spreadsheet)
│       └── [Responses Tab]
│
└── Monthly Monitoring Form_ Response_FORM-003/      (Form Dedicated Folder)
    └── Monthly Monitoring Form_ Response            (Form Dedicated Google Spreadsheet)
```

---

## 3. Form Response Spreadsheet Columns

Inside each form's dedicated Google Spreadsheet, the Response tab contains:

| Column A | Column B | Column C | Column D | Column E | ... |
| --- | --- | --- | --- | --- | --- |
| **Form ID** | **ID** | **Timestamp** | **Field 1** | **Field 2** | ... |
| `FORM-001` | `RESP-FORM001-20260820153000-4821` | `2026-08-20 15:30:00` | Child Safety | Mumbai | ... |

* **Column A (`Form ID`)**: Form identifier (e.g. `FORM-001`).
* **Column B (`ID`)**: Unique collision-safe response ID generated automatically on submission.
* **Column C (`Timestamp`)**: IST timestamp (`Asia/Kolkata`: `yyyy-MM-dd HH:mm:ss`).
* **Column D onward**: Form fields in configured order from that form's backend configuration.

---

## 4. Attachment / File Upload Handling

* File uploads are **never** stored inside the spreadsheet itself.
* For each attachment/file field, Google Apps Script creates a dedicated sub-folder inside that form's folder, named after the field (e.g. `School Photo/`, `Supporting Document/`).
* Uploaded files are saved to their respective Drive folder.
* The Google Spreadsheet stores the **Google Drive file URL/link** in that field's column.

---

## 5. Form Deletion & Historical Data Preservation Rule

* Deleting, removing, or disabling a form in the portal or in `Forms-Details` **never** deletes its response Google Spreadsheet, Drive folders, or uploaded attachments.
* Re-enabling or recreating the form with the same `Form ID` automatically re-connects to the existing response folder and continues recording responses seamlessly.

---

## 6. Google Apps Script Setup & Deployment

1. Open your Master Google Spreadsheet.
2. Click **Extensions** > **Apps Script**.
3. Replace the content of `Code.gs` with [`backend/gas/Code.gs`](file:///c:/Users/aanga/OneDrive/Documents/GitHub/Aangan-Data-Collection/backend/gas/Code.gs).
4. Click **Deploy** > **New deployment**.
5. Select type: **Web app**.
6. Set:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
7. Copy the generated **Web App URL** and set it in `.env.local` and Vercel environment variables:
   ```
   GAS_BASE_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
