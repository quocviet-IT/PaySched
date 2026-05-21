# Calendar view cho Payment Schedules

> Mô tả tính năng đề xuất — chưa implement.

## 1. Vấn đề hiện tại

Trong Dashboard, bảng "Payment Schedules" hiển thị mỗi schedule **1 dòng**. Để biết "tuần sau có những payment nào", người dùng phải scroll cột `Next Due` và tự tổng hợp trong đầu. Khi có 50+ schedules với nhiều ngày khác nhau, rất khó visualize tổng quan tháng/tuần.

## 2. Mục tiêu

Cho phép người dùng tài chính nhìn 1 tháng schedules cùng lúc theo dạng lịch (calendar grid), thấy ngay:

- Ngày nào có payment phải trả
- Tổng số tiền theo ngày
- Click để xem chi tiết và record payment nhanh

## 3. Layout

Lưới 7 cột × 5–6 hàng (như Google Calendar / Outlook), mỗi ô là 1 ngày.

```
┌──────────────────── November 2026 ────────────────────┐
│  Mon    Tue    Wed    Thu    Fri    Sat    Sun        │
├───────────────────────────────────────────────────────┤
│   1      2      3      4      5      6      7         │
│         •      ••              •                       │
│         $500   $3200          $1200                    │
├───────────────────────────────────────────────────────┤
│   8      9     10     11     12     13     14         │
│                       •••                              │
│                       $4450                            │
└───────────────────────────────────────────────────────┘
```

### Mỗi ô ngày hiển thị

- **Số ngày** (`1`, `2`, `3`…)
- **Chấm/badge** số schedules due ngày đó (`••` = 2 schedules)
- **Tổng tiền** phải trả ngày đó (`$3200`)
- **Màu nền/border**:
  - Đỏ nhạt: ngày overdue (quá khứ và chưa thanh toán)
  - Xám đậm hơn: hôm nay
  - Pink subtle: weekend (cảnh báo vì có thể không xử lý kịp)
  - Trắng: ngày bình thường

## 4. Tương tác

### Click 1 ô ngày

Popup nhỏ list tất cả schedules due ngày đó:

```
─── 11 Nov 2026 ───────────────────────────────
✓ Intuit          $850   Monthly   [Record payment]
✓ AWS             $2100  Monthly   [Record payment]
✓ Office Rent     $1500  One-time  [Record payment]
```

Mỗi item có nút **Record payment** mở dialog record payment trực tiếp, không cần đóng calendar đi tìm trong bảng.

### Navigation

- Nút `<` / `>` chuyển tháng trước/sau
- Nút **Today** nhảy về tháng hiện tại
- Dropdown chọn tháng/năm nhanh

## 5. Vị trí trong UI

**Option A — Khuyến nghị**: Tab mới trong Dashboard panel "Payment Schedules", cạnh các tab `All / Due soon / Overdue / Recurring`. Tên tab: **Calendar**.

Lý do: người dùng có thể switch view List ↔ Calendar mà không rời Dashboard, giữ context filter (search bar, search query).

**Option B**: Route mới `/schedule-calendar` thêm vào sidebar nav. Phù hợp khi calendar trở thành feature lớn, có nhiều bộ lọc/cài đặt riêng.

## 6. Edge cases cần xử lý

| Case | Xử lý |
|---|---|
| **Recurring schedules** (monthly/quarterly/yearly) | Expand 12 tháng tới từ `next_due_date` theo frequency. Mỗi instance hiển thị như 1 ô riêng. |
| **Schedules `status='completed'`** | Ẩn hoàn toàn — one-time đã thanh toán không nên hiện ở tương lai. |
| **Quá nhiều schedules 1 ngày** (> 3) | Hiển thị `••• +5 more` → click mở popup full list. |
| **Mobile (< 640px)** | Lưới 7 cột quá hẹp. Fallback sang dạng list "Tuần này / Tuần tới" với từng day-section. |
| **Schedule có due date trong quá khứ** (overdue) | Hiển thị ở tháng hiện tại với badge đỏ "OVERDUE" thay vì ở tháng quá khứ. |
| **Multi-currency** (nếu sau này có) | Hiện tổng theo currency chính, hover tooltip cho breakdown. |

## 7. Computation logic

```ts
// pseudocode
function expandSchedules(schedules, monthStart, monthEnd) {
  const occurrences: { date: Date; schedule: PaymentSchedule }[] = [];
  for (const s of schedules) {
    if (s.status === 'completed') continue;
    let cursor = new Date(s.nextDueDate);
    while (cursor <= monthEnd) {
      if (cursor >= monthStart) {
        occurrences.push({ date: new Date(cursor), schedule: s });
      }
      // advance theo frequency
      if (s.frequency === 'one-time') break;
      cursor = advanceByFrequency(cursor, s.frequency);
      if (s.frequency === 'bi-weekly') cursor.setDate(cursor.getDate() + 14);
      // monthly: cursor.setMonth(cursor.getMonth() + 1)
      // quarterly: + 3 months
      // yearly: + 1 year
    }
  }
  // group by date string YYYY-MM-DD
  return groupBy(occurrences, o => isoDate(o.date));
}
```

Memoize theo `(schedules, viewMonth)` để re-render nhanh khi chuyển tháng.

## 8. Effort estimate

~4–5 giờ:

| Phần | Thời gian |
|---|---|
| Component lưới + state quản lý tháng | 1h |
| Logic expand recurring schedules 12 tháng | 1h |
| Day cell: chấm + tiền + popup click | 1h |
| Mobile responsive (fallback list) | 1h |
| Tích hợp Record Payment dialog từ popup | 0.5h |
| Test + polish | 0.5h |

## 9. Acceptance criteria

- [ ] Có tab "Calendar" trong Schedules panel
- [ ] Hiển thị đúng tháng hiện tại khi mở; có nút prev/next/today
- [ ] Mỗi ô ngày hiện đúng count + tổng tiền của schedules due ngày đó
- [ ] Recurring schedules hiển thị ở các tháng tiếp theo
- [ ] Click vào ô có schedule → popup list với nút Record payment
- [ ] Record payment từ popup → đóng popup, refresh data, schedule chuyển tháng tiếp theo (recurring) hoặc completed (one-time)
- [ ] Trên mobile, fallback sang dạng list "Tuần này / Tuần tới"
- [ ] Ngày overdue đánh dấu màu đỏ
- [ ] Hôm nay highlight nổi bật

## 10. Mock screenshot reference

(Để thêm sau khi designer/dev wireframe)

---

**Trạng thái**: Đề xuất — chờ chốt scope trước khi implement.
**Tác giả**: Spec từ requirement, May 2026.
**Liên quan**:
- `app/(app)/dashboard/schedules-panel.tsx` (sẽ thêm tab Calendar)
- `app/(app)/dashboard/record-actions.tsx` (Record Payment dialog dùng lại)
- `shared/schema.ts` — `paymentSchedules.frequency`, `paymentSchedules.nextDueDate`
