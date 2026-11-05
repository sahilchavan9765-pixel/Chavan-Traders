import React from "react";
import {
  formatIndianCurrency,
  numberToMarathiWords,
  formatDateDDMMYYYY,
} from "@/lib/calculations";

export interface DedicatedInvoiceItem {
  id?: string;
  productName: string;
  grade?: string | null;
  bagWeights?: any;
  cutKg?: string | number;
  netKg?: string | number;
  ratePerKg?: string | number;
  totalAmount?: string | number;
}

export interface DedicatedInvoiceData {
  id: string;
  kind: "purchase" | "sale";
  billNo: string;
  billDate: string;
  partyName: string;
  partyPhone?: string | null;
  partyVillage?: string | null;
  hamali?: string | number;
  paidNow?: string | number;
  netPayable?: number;
  totalPaid?: number;
  balanceDue?: number;
  note?: string | null;
  isDeleted?: boolean;
  deleteReason?: string | null;
  items: DedicatedInvoiceItem[];
}

export function DedicatedInvoicePdfTemplate({
  bill,
}: {
  bill: DedicatedInvoiceData;
}) {
  const isPurchase = bill.kind === "purchase";
  const items = bill.items || [];

  const totalNetKg = items.reduce(
    (acc, it) => acc + (Number(it.netKg) || 0),
    0
  );
  const itemsTotal = items.reduce(
    (acc, it) => acc + (Number(it.totalAmount) || 0),
    0
  );
  const hamali = Number(bill.hamali) || 0;
  const netPayable = bill.netPayable ?? Math.max(0, itemsTotal - hamali);
  const totalPaid = bill.totalPaid ?? (Number(bill.paidNow) || 0);
  const balanceDue = bill.balanceDue ?? Math.max(0, netPayable - totalPaid);
  const isPaid = balanceDue <= 0;

  const marathiWords = numberToMarathiWords(netPayable);

  return (
    <div
      id="dedicated-pdf-invoice-template"
      style={{
        width: "794px",
        backgroundColor: "#ffffff",
        color: "#1d1d1b",
        fontFamily: '"Noto Sans Devanagari", "Noto Serif Devanagari", sans-serif',
        border: "1px solid #d4d0c7",
        boxSizing: "border-box",
        margin: "0 auto",
        padding: "0",
        position: "relative",
      }}
    >
      {/* Void Banner if deleted */}
      {bill.isDeleted && (
        <div
          style={{
            backgroundColor: "#dc2626",
            color: "#ffffff",
            padding: "8px 16px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "1px",
          }}
        >
          हे बिल रद्द (VOID / DELETED) केलेले आहे.{" "}
          {bill.deleteReason ? `कारण: ${bill.deleteReason}` : ""}
        </div>
      )}

      {/* 1. Header Pink Box */}
      <div
        style={{
          backgroundColor: "#fad4d4",
          borderBottom: "1px solid #f2bcbc",
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#701522",
            fontSize: "30px",
            fontWeight: "800",
            fontFamily: '"Noto Serif Devanagari", serif',
            lineHeight: "1.2",
          }}
        >
          चव्हाण ट्रेडर्स
        </div>
        <div
          style={{
            color: "#1d1d1b",
            fontSize: "15px",
            fontWeight: "700",
            marginTop: "4px",
          }}
        >
          कै. श्री. रमेश कृष्णा चव्हाण
        </div>
        <div
          style={{
            color: "#444444",
            fontSize: "13px",
            marginTop: "2px",
          }}
        >
          मु.पो. उत्तूर, तळेगळ्ळी, ता. आजरा, जि. कोल्हापूर.
        </div>
        <div
          style={{
            color: "#1d1d1b",
            fontSize: "13px",
            fontWeight: "700",
            fontFamily: "monospace",
            marginTop: "2px",
          }}
        >
          मो. 9765941078 • 9850815527
        </div>
      </div>

      {/* 2. Bill Title Bar & Status Pill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid #eeeeee",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#1d1d1b",
            fontFamily: '"Noto Serif Devanagari", serif',
          }}
        >
          {isPurchase ? "खरेदी बिल" : "विक्री बिल"}
        </div>
        <div>
          {isPaid ? (
            <span
              style={{
                backgroundColor: "#d4ecd9",
                color: "#1f4d33",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "700",
                display: "inline-block",
              }}
            >
              पूर्ण भरले
            </span>
          ) : (
            <span
              style={{
                backgroundColor: "#fcedbe",
                color: "#7c4a03",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "700",
                display: "inline-block",
              }}
            >
              बाकी रक्कम
            </span>
          )}
        </div>
      </div>

      {/* 3. Party & Bill Details (2 Columns) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          padding: "16px 24px",
          borderBottom: "1px solid #d4d0c7",
          gap: "24px",
        }}
      >
        {/* Left: Party */}
        <div>
          <div style={{ fontSize: "12px", color: "#777777", marginBottom: "4px" }}>
            {isPurchase ? "शेतकरी" : "ग्राहक"}
          </div>
          <div
            style={{
              fontSize: "17px",
              fontWeight: "700",
              color: "#1d1d1b",
              lineHeight: "1.3",
            }}
          >
            {bill.partyName}
          </div>
          {bill.partyVillage && (
            <div style={{ fontSize: "13px", color: "#444444", marginTop: "2px" }}>
              {bill.partyVillage}
            </div>
          )}
          {bill.partyPhone && (
            <div
              style={{
                fontSize: "13px",
                color: "#444444",
                marginTop: "2px",
                fontFamily: "monospace",
              }}
            >
              {bill.partyPhone}
            </div>
          )}
        </div>

        {/* Right: Bill Meta */}
        <div style={{ borderLeft: "1px solid #e0ddd5", paddingLeft: "24px" }}>
          <div style={{ fontSize: "12px", color: "#777777", marginBottom: "4px" }}>
            बिल तपशील
          </div>
          <div
            style={{
              fontSize: "17px",
              fontWeight: "700",
              color: "#1d1d1b",
              fontFamily: "monospace",
            }}
          >
            बिल क्र. {bill.billNo}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#444444",
              marginTop: "2px",
              fontWeight: "500",
            }}
          >
            दिनांक {formatDateDDMMYYYY(bill.billDate)}
          </div>
        </div>
      </div>

      {/* 4. Crop Items Table */}
      <div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f9f8f5",
                borderBottom: "1px solid #d4d0c7",
                color: "#666666",
                textAlign: "left",
              }}
            >
              <th
                style={{
                  padding: "10px 14px",
                  width: "40px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                #
              </th>
              <th style={{ padding: "10px 14px", fontWeight: "600" }}>
                मालाचे नाव
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                निव्वळ KG
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                भाव ₹
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                रक्कम ₹
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              let bagsArr: number[] = [];
              if (Array.isArray(item.bagWeights)) {
                bagsArr = item.bagWeights.map(Number).filter((w) => !isNaN(w));
              } else if (typeof item.bagWeights === "string") {
                try {
                  const p = JSON.parse(item.bagWeights);
                  if (Array.isArray(p)) bagsArr = p.map(Number);
                } catch {
                  bagsArr = [];
                }
              }
              const sumBags = bagsArr.reduce((a, b) => a + b, 0);
              const bagsStr =
                bagsArr.length > 0 ? `${bagsArr.join("+")} = ${sumBags}` : "";
              const cutVal = Number(item.cutKg) || 0;

              return (
                <tr
                  key={item.id || index}
                  data-pdf-table-row="true"
                  style={{
                    borderBottom: "1px solid #eef0ea",
                    verticalAlign: "top",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "center",
                      color: "#888888",
                      fontFamily: "monospace",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: "700", color: "#1d1d1b" }}>
                      {item.productName}
                      {item.grade && (
                        <span style={{ fontWeight: "400", color: "#555555" }}>
                          {" "}
                          ({item.grade})
                        </span>
                      )}
                    </div>
                    {bagsStr && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#666666",
                          fontFamily: "monospace",
                          marginTop: "2px",
                        }}
                      >
                        {bagsStr}
                      </div>
                    )}
                    {cutVal > 0 && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#666666",
                          fontFamily: "monospace",
                          marginTop: "2px",
                        }}
                      >
                        कट - {cutVal}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#1d1d1b",
                    }}
                  >
                    {Number(item.netKg) % 1 === 0
                      ? Number(item.netKg)
                      : Number(item.netKg).toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#1d1d1b",
                    }}
                  >
                    {Number(item.ratePerKg) % 1 === 0
                      ? Number(item.ratePerKg)
                      : Number(item.ratePerKg).toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: "700",
                      color: "#1d1d1b",
                    }}
                  >
                    {Math.round(Number(item.totalAmount)).toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Totals Section */}
      <div
        style={{
          borderTop: "1px solid #d4d0c7",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ width: "320px", fontSize: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              color: "#555555",
            }}
          >
            <span>एकूण वजन (निव्वळ)</span>
            <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
              {totalNetKg % 1 === 0 ? totalNetKg : totalNetKg.toFixed(2)} KG
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              color: "#555555",
            }}
          >
            <span>एकूण</span>
            <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
              ₹{Math.round(itemsTotal).toLocaleString("en-IN")}
            </span>
          </div>

          {hamali > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
                color: "#b91c1c",
              }}
            >
              <span>हमाली वजावट</span>
              <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
                - ₹{Math.round(hamali).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #d4d0c7",
              paddingTop: "8px",
              marginBottom: "6px",
              fontWeight: "700",
              fontSize: "16px",
              color: "#1d1d1b",
            }}
          >
            <span>निव्वळ देय</span>
            <span style={{ fontFamily: "monospace" }}>
              ₹{Math.round(netPayable).toLocaleString("en-IN")}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              color: "#555555",
              fontSize: "13px",
            }}
          >
            <span>{isPurchase ? "दिले" : "मिळाले"}</span>
            <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
              ₹{Math.round(totalPaid).toLocaleString("en-IN")}
            </span>
          </div>

          {/* Golden Highlight Due Box */}
          <div
            style={{
              backgroundColor: "#fcedbe",
              padding: "10px 16px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            <span style={{ fontWeight: "700", fontSize: "14px", color: "#503000" }}>
              बाकी
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: "800",
                fontSize: "20px",
                color: "#1d1d1b",
              }}
            >
              ₹{Math.round(balanceDue).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Marathi Words & Terms */}
      <div
        style={{
          borderTop: "1px solid #eeeeee",
          padding: "14px 24px",
          fontSize: "12px",
          color: "#444444",
        }}
      >
        <div style={{ fontWeight: "500", color: "#1d1d1b" }}>
          अक्षरी: रुपये {marathiWords} फक्त
        </div>
        <div style={{ fontSize: "11px", color: "#666666", marginTop: "4px" }}>
          अटी: वजन व भाव {isPurchase ? "शेतकऱ्यास" : "ग्राहकास"} मान्य आहेत.
        </div>
      </div>

      {/* 7. Signatures */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          padding: "24px 24px 16px 24px",
          textAlign: "center",
          fontSize: "12px",
          color: "#444444",
        }}
      >
        <div>
          <div
            style={{
              width: "160px",
              borderBottom: "1px solid #999999",
              margin: "0 auto 6px auto",
            }}
          />
          <div style={{ fontWeight: "600" }}>
            {isPurchase ? "शेतकरी सही" : "ग्राहक सही"}
          </div>
        </div>
        <div>
          <div
            style={{
              width: "160px",
              borderBottom: "1px solid #999999",
              margin: "0 auto 6px auto",
            }}
          />
          <div style={{ fontWeight: "600" }}>चव्हाण ट्रेडर्स</div>
        </div>
      </div>

      {/* 8. Bottom Greeting Bar */}
      <div
        style={{
          backgroundColor: "#f7f6f2",
          borderTop: "1px solid #eeeeee",
          padding: "10px",
          textAlign: "center",
          fontSize: "12px",
          color: "#666666",
          fontWeight: "600",
        }}
      >
        धन्यवाद! पुन्हा भेट द्या.
      </div>
    </div>
  );
}

