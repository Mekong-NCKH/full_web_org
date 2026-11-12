# Đánh giá đa tác vụ mô hình dự báo và nội suy cho chuỗi quan trắc vùng cửa sông Mekong

**Bản thảo nghiên cứu kỹ thuật — 12 tháng 11 năm 2026**

**Phạm vi:** tái lập bằng chứng nội bộ, chưa qua phản biện đồng cấp

## Tóm tắt

Nghiên cứu này so sánh bốn kiến trúc Time-Series-Library (TSLib)—TimesNet, PatchTST, DLinear và iTransformer—trên hai tác vụ dùng chung sáu chuỗi độ mặn và mực nước theo giờ tại Bao Dinh, Go Cat và Vam Kenh: dự báo 24 giờ và nội suy điểm bị che. Với độ lệch chuẩn fit làm đơn vị chuẩn hóa, PatchTST đạt nMAE forecast thấp nhất (0,6550); TimesNet đạt nMAE imputation thấp nhất (0,4564). Chọn ứng viên đa tác vụ bằng thứ hạng trung bình của hai tác vụ; kết quả là PatchTST, TimesNet và DLinear. Nguồn BaoDinh.csv có 1.464 giờ liên tục trong cửa sổ 01/06–31/07/2024, không có giá trị khuyết tự nhiên. Imputation được đánh giá bằng mặt nạ MCAR 25% trên holdout; forecasting dùng 18 origin không chồng lấp, mỗi origin 24 giờ. Cả bốn mô hình TSLib giảm MAE/RMSE so với daily seasonal naive trên sáu chuỗi trong lần chạy này. Tuy vậy, bằng chứng chỉ gồm một cửa sổ hai tháng và một seed; tất cả checkpoint forecast tốt nhất chạm giới hạn 40 epoch. Kết quả đủ để ưu tiên phương pháp cho nghiên cứu tiếp, chưa đủ xác nhận hiệu quả ở mùa khác hay sử dụng vận hành. Trang `/home` trình bày đánh giá dự báo; bản thảo khoa học báo cáo riêng cả hai tác vụ và không thay thế quan trắc bằng giá trị dự đoán.

**Từ khóa:** dự báo chuỗi thời gian; nội suy; dữ liệu thiếu; độ mặn; mực nước; TimesNet; PatchTST; DLinear; Mekong.

## 1. Đặt vấn đề

Thiếu dữ liệu trong chuỗi quan trắc có thể xuất hiện do mất kết nối, lỗi cảm biến, bảo trì hoặc lỗi lưu trữ. Nội suy là bước tiền xử lý hữu ích, nhưng hiệu quả phụ thuộc vào dạng thiếu dữ liệu, chu kỳ vật lý, thời lượng khoảng trống và việc có thể dùng quan sát tương lai hay không. Dự báo có mục tiêu khác: dự đoán giá trị chưa quan sát ở tương lai từ lịch sử đã biết. Một mô hình có thể tốt ở một tác vụ nhưng kém ở tác vụ kia; vì vậy hai kết quả cần được báo riêng trước khi chọn cấu hình dùng cho dự án.

Time-Series-Library cung cấp một tập mã nguồn dùng cho nhiều tác vụ phân tích chuỗi thời gian, trong đó có nội suy [5]. Các kiến trúc được chọn đại diện cho ba giả thuyết khác nhau. TimesNet chuyển biểu diễn chuỗi theo các chu kỳ để học biến thiên nội chu kỳ và giữa chu kỳ [1]. PatchTST chia chuỗi thành các patch và dùng biểu diễn chia sẻ theo kênh [2]. DLinear tách chuỗi bằng bộ lọc trung bình động rồi học phép chiếu tuyến tính trên thành phần xu thế và phần dư [3]. iTransformer được đưa vào làm đối chứng kiến trúc Transformer hóa các biến [4].

Mục tiêu của nghiên cứu là: (i) chạy lại bốn mô hình TSLib cho forecast 24 giờ và imputation điểm; (ii) so sánh với baseline dự báo và nội suy đơn giản; (iii) chọn top 3 theo thứ hạng cân bằng qua hai tác vụ; (iv) đề xuất cách hiển thị trong ứng dụng quan trắc mà vẫn tách kết quả nghiên cứu khỏi số đo thật. Đây là benchmark thích nghi theo dữ liệu Mekong, không phải tái lập các con số gốc trên ETTh, Weather hay các bộ dữ liệu chuẩn khác.

## 2. Dữ liệu và thiết kế đánh giá

### 2.1. Nguồn dữ liệu

Nguồn là `Sanility_GIS_Monitoring/BaoDinh.csv` với hash SHA-256 `cc9e1caabe4faec9b524af122618b8890fb1d7db35377475daed2a30af04af48`. Cửa sổ gồm 1.464 mốc giờ liên tục từ 01/06/2024 00:00 đến 31/07/2024 23:00, múi giờ UTC+07:00. Chỉ dùng ba trạm có tọa độ đã xác minh: Bao Dinh, Go Cat và Vam Kenh. Mỗi trạm có một chuỗi độ mặn và một chuỗi mực nước, tạo thành sáu kênh.

Độ mặn nguồn tính bằng g/L được đổi sang mg/L bằng cách nhân 1.000; mực nước tính bằng m. Cả sáu kênh đều có đủ 1.464 giá trị trong cửa sổ. Không có khoảng trống tự nhiên trong nguồn. Các giá trị 0 và âm được giữ nguyên; các giá trị độ mặn âm cần được chủ dữ liệu thẩm định trước diễn giải vật lý. Số điểm độ mặn âm trong cửa sổ là Bao Dinh 106, Go Cat 337 và Vam Kenh 20.

### 2.2. Chia tập và huấn luyện

Chia dữ liệu theo thứ tự thời gian. 70% đầu (1.024 giờ) là phần phát triển; 30% cuối (440 giờ) là holdout. Trong phần phát triển, 80% đầu (819 giờ, kết thúc 05/07/2024 02:00) dùng để fit mô hình và tính chuẩn hóa; 20% tiếp theo dùng để chọn checkpoint bằng early stopping. Holdout bắt đầu 13/07/2024 16:00.

Mỗi mô hình dùng cửa sổ đầu vào 96 giờ, sáu kênh, Adam với learning rate `1e-4`, batch 32, tối đa 40 epoch và patience 7. Mỗi kênh được chuẩn hóa bằng trung bình và độ lệch chuẩn của tập fit; không dùng holdout để ước lượng tham số chuẩn hóa. Chạy trên CPU với seed cơ sở `20261111` và các seed mô hình xác định trong runner. Các mô hình dùng các lớp gốc từ TSLib commit `4e938a1767106324dd753b2a44832bf870a0252e`.

### 2.3. Dự báo 24 giờ

Mô hình dùng cửa sổ lịch sử 96 giờ để dự đoán 24 giờ kế tiếp. Trên 30% holdout, chạy 18 origin không chồng lấp; mỗi khối có 24 target và tổng cộng 432 target được chấm cho mỗi kênh. Tám giờ cuối không tạo thành khối 24 giờ nên không tính điểm. Sau mỗi khối, các quan sát đã xảy ra được đưa vào ngữ cảnh origin tiếp theo. Mất mát huấn luyện là MSE trên chuỗi chuẩn hóa.

Đối chứng dự báo là persistence (lặp lại giá trị gần nhất), daily seasonal naive (lặp lại giá trị cùng giờ ngày trước) và DLinear đơn biến từ Stage 6. So sánh dùng cùng nguồn, ranh giới holdout và target points. MAPE không dùng vì dữ liệu có số 0 và âm.

### 2.4. Mặt nạ nội suy và đối chứng

Trong 440 giờ holdout, tạo mặt nạ MCAR điểm độc lập ở tỷ lệ 25% cho từng kênh: 110 điểm bị che trên mỗi chuỗi, tổng 660 điểm chấm. Mặt nạ cố định và dùng chung giữa các mô hình. Mô hình nhận các quan sát không bị che trong cửa sổ 96 giờ và phải khôi phục giá trị gốc tại các vị trí bị che. Các quan sát holdout còn lại được phép làm ngữ cảnh.

Đối chứng gồm:

1. **Trung bình train:** thay điểm khuyết bằng trung bình của kênh tính trên tập fit.
2. **Nội suy tuyến tính hai phía:** nối tuyến tính các quan sát đã biết trước và sau điểm khuyết. Đây là đối chứng hậu nghiệm; nó sử dụng dữ liệu tương lai quanh điểm thiếu khi các dữ liệu đó còn hiện diện.

Vì nguồn không có giá trị khuyết thật, mọi phép đo nội suy trong nghiên cứu này là phục hồi điểm bị che nhân tạo. Thí nghiệm không đánh giá khả năng nội suy nhân quả tại thời điểm chỉ có dữ liệu quá khứ.

### 2.5. Chỉ số

Với giá trị thật $y_i$, giá trị dự báo/khôi phục $\hat{y}_i$ và độ lệch chuẩn kênh $s_j$ trên tập fit:

- $MAE_j = mean(|\hat{y}_i-y_i|)$
- $RMSE_j = sqrt(mean((\hat{y}_i-y_i)^2))$
- $nMAE_j = MAE_j/s_j$, $nRMSE_j = RMSE_j/s_j$
- Điểm macro là trung bình không trọng số của sáu kênh.

MAE thể hiện sai số tuyệt đối điển hình; RMSE nhấn mạnh lỗi lớn. Chuẩn hóa theo $s_j$ giúp gộp mg/L và m mà không làm kênh có thang đo lớn áp đảo do đơn vị. Điểm macro không thay thế kiểm tra sai số trong đơn vị vật lý từng trạm.

## 3. Kết quả

### 3.1. Dự báo 24 giờ

| Phương pháp | nMAE ↓ | nRMSE ↓ | Hạng trong TSLib |
| --- | ---: | ---: | ---: |
| **PatchTST** | **0,6550** | **0,8977** | 1 |
| DLinear đa biến | 0,7006 | 0,9575 | 2 |
| iTransformer | 0,7182 | 0,9677 | 3 |
| TimesNet | 0,7216 | 0,9627 | 4 |
| DLinear đơn biến (Stage 6) | 0,6676 | 0,9098 | — |
| Daily seasonal naive 24h | 0,8513 | 1,2699 | — |
| Persistence | 1,0447 | 1,4818 | — |

Tất cả bốn mô hình TSLib giảm MAE/RMSE so với daily seasonal naive trên cả sáu chuỗi. PatchTST dẫn đầu trong các mô hình đa biến; chênh lệch với DLinear đơn biến của Stage 6 nhỏ, khoảng 1,9% nMAE. Đây là một holdout duy nhất và mọi mô hình forecast đạt checkpoint tốt nhất tại epoch 40/40, nên độ hội tụ chưa được chứng minh.

### 3.2. Nội suy điểm bị che

| Phương pháp | nMAE ↓ | nRMSE ↓ | Epoch checkpoint |
| --- | ---: | ---: | ---: |
| **TimesNet** | **0,4564** | **0,7301** | 26 |
| **PatchTST** | **0,6753** | **1,0041** | 39 |
| **DLinear** | **0,7087** | **1,0476** | 39 |
| iTransformer | 0,7732 | 1,1345 | 40 |
| Trung bình train | 0,7921 | 1,1422 | — |
| Nội suy tuyến tính | 0,9106 | 1,2465 | — |

TimesNet giảm nMAE macro khoảng 42,4% so với trung bình train và 49,9% so với nội suy tuyến tính. PatchTST giảm tương ứng 14,7% và 25,8%; DLinear giảm 10,5% và 22,2%. Cả ba phương pháp đều có nMAE và nRMSE thấp hơn hai đối chứng ở điểm macro của lần chạy này.

### 3.3. Nội suy theo loại biến

| Biến | TimesNet | PatchTST | DLinear | iTransformer | Trung bình train | Tuyến tính |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Độ mặn (3 trạm) | **0,5522** | 0,8039 | 0,8693 | 0,9492 | 0,9839 | 1,0571 |
| Mực nước (3 trạm) | **0,3607** | 0,5467 | 0,5480 | 0,5971 | 0,6003 | 0,7640 |

Độ mặn khó khôi phục hơn mực nước theo nMAE trong cửa sổ này. TimesNet đứng đầu ở cả sáu chuỗi. PatchTST có nMAE thấp hơn DLinear tại bốn trong sáu chuỗi; DLinear nhỉnh hơn nhẹ trên Go Cat mực nước và Vam Kenh mực nước. Kết quả macro vì vậy che đi một số khác biệt theo trạm.

### 3.4. Sai số vật lý của ba ứng viên imputation

| Trạm | Biến | Đơn vị | TimesNet MAE | PatchTST MAE | DLinear MAE |
| --- | --- | --- | ---: | ---: | ---: |
| Bao Dinh | Độ mặn | mg/L | 36,54 | 56,69 | 58,98 |
| Bao Dinh | Mực nước | m | 0,131 | 0,237 | 0,248 |
| Go Cat | Độ mặn | mg/L | 171,09 | 252,05 | 284,76 |
| Go Cat | Mực nước | m | 0,155 | 0,270 | 0,265 |
| Vam Kenh | Độ mặn | mg/L | 1.862,27 | 2.508,40 | 2.710,00 |
| Vam Kenh | Mực nước | m | 0,292 | 0,351 | 0,345 |

Các giá trị MAE là trên 110 điểm bị che ở mỗi kênh. Độ lớn rất khác nhau giữa các trạm; do đó không dùng MAE mg/L toàn cục để xếp hạng chéo trạm. Độ mặn Vam Kenh có MAE lớn nhất, phù hợp với độ biến động lớn hơn của kênh này; đây không phải bằng chứng nguyên nhân vật lý.

## 4. Xếp hạng đa tác vụ và ba ứng viên nghiên cứu

Chọn mô hình cho báo cáo đa tác vụ bằng hai bước được công bố trước khi đọc bảng xếp hạng: xếp hạng bốn mô hình TSLib theo nMAE riêng trong forecast và imputation, rồi lấy trung bình hai thứ hạng với trọng số bằng nhau. Nếu đồng hạng, dùng nMAE macro trung bình có trọng số bằng nhau giữa hai tác vụ để phá hòa. Quy tắc này tránh để thang đo vật lý hoặc một tác vụ quyết định toàn bộ thứ tự. Đây là quy tắc chọn ứng viên nghiên cứu, không phải kiểm định thống kê.

| Mô hình | Hạng forecast | Hạng imputation | Hạng trung bình | nMAE forecast | nMAE imputation | nMAE trung bình hai tác vụ | Hạng đa tác vụ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **PatchTST** | 1 | 2 | **1,5** | 0,6550 | 0,6753 | 0,6652 | **1** |
| **TimesNet** | 4 | 1 | **2,5** | 0,7216 | 0,4564 | **0,5890** | **2** |
| **DLinear** | 2 | 3 | **2,5** | 0,7006 | 0,7087 | 0,7046 | **3** |
| iTransformer | 3 | 4 | 3,5 | 0,7182 | 0,7732 | 0,7457 | 4 |

### 4.1. PatchTST — ứng viên cân bằng, đứng đầu dự báo

PatchTST có nMAE thấp nhất ở dự báo 24 giờ (`0,6550`) và đứng thứ hai trong nội suy (`0,6753`), nên có hạng trung bình tốt nhất (`1,5`). Cách chia chuỗi thành patch giữ biểu diễn cục bộ trong khi học quan hệ dài hơn [2]. Đây là ứng viên ưu tiên cho benchmark mở rộng khi mục tiêu là dự báo nhưng vẫn cần đánh giá khả năng khôi phục điểm bị che.

**Điều kiện:** checkpoint tốt nhất của cả hai tác vụ ở epoch 39/40. Một seed và một holdout không đủ chứng minh lợi thế ổn định; cần mở rộng epoch và lặp lại theo nhiều seed trước khi cân nhắc vận hành.

### 4.2. TimesNet — dẫn đầu nội suy, bổ sung góc nhìn chu kỳ

TimesNet đạt nMAE imputation thấp nhất (`0,4564`) và thắng ở cả sáu chuỗi nội suy, nhưng chỉ xếp thứ tư trong forecast (`0,7216`). Hạng trung bình `2,5` đồng hạng với DLinear; nMAE trung bình hai tác vụ thấp hơn (`0,5890` so với `0,7046`) nên TimesNet đứng thứ hai theo quy tắc phá hòa. Cách biểu diễn các biến thiên chu kỳ thành cấu trúc 2D là một giả thuyết có ích để kiểm tra trên chuỗi thủy văn [1], chưa phải giải thích nhân quả cho kết quả.

**Điều kiện:** ưu thế hiện tại tập trung ở imputation; forecast kém PatchTST và DLinear. Cần thử nhiều dạng khuyết, nhiều seed và rolling-origin trước khi chọn riêng cho dự báo.

### 4.3. DLinear — đối chứng gọn với thứ hạng ổn định ở giữa

DLinear đứng thứ hai ở forecast (`0,7006`) và thứ ba ở imputation (`0,7087`), đạt hạng trung bình `2,5`. Phân rã xu thế/phần dư cùng phép chiếu tuyến tính làm mô hình tương đối dễ kiểm tra và hữu ích như một mốc học được có cấu trúc đơn giản [3].

**Điều kiện:** DLinear đa biến trong benchmark không được gộp với DLinear đơn biến Stage 6. Biến thể đơn biến có nMAE `0,6676`, thấp hơn daily seasonal naive `0,8513`, nhưng cổng Stage 7 vẫn giữ quyết định `HOLD` do tiêu chí sai lệch tuyệt đối chưa đạt. Vì vậy điểm normalized tốt không đủ để đề xuất triển khai.

iTransformer xếp thứ ba ở forecast và thứ tư ở imputation; nMAE của nó không dẫn đầu tác vụ nào trong benchmark này. Không vào top 3 đa tác vụ không phủ định kết quả trên bộ dữ liệu hoặc tác vụ khác [4].

## 5. Bàn luận và giá trị sử dụng

### 5.1. Bằng chứng đủ để nói gì

Trên holdout duy nhất, cả bốn mô hình TSLib giảm MAE và RMSE forecast so với daily seasonal naive trên cả sáu chuỗi; PatchTST dẫn đầu theo nMAE macro. Với imputation, TimesNet dẫn đầu cả sáu chuỗi và ba mô hình được chọn thấp hơn hai baseline đơn giản ở cả nMAE và nRMSE macro. Kết quả hỗ trợ ưu tiên PatchTST cho thử nghiệm dự báo kế tiếp, đồng thời giữ TimesNet và DLinear trong thiết kế đa tác vụ để bao phủ lần lượt imputation mạnh và đối chứng gọn.

Không thể suy ra xác suất thắng ở giai đoạn khác từ thứ hạng một lần chạy. Không có nhiều seed, nhiều bộ mask, khoảng tin cậy hay kiểm định ghép cặp. Tất cả checkpoint forecast tốt nhất chạm giới hạn 40 epoch; PatchTST và DLinear imputation còn sát giới hạn. Tiếp tục huấn luyện hoặc đổi seed có thể đổi thứ hạng. Sáu kênh cũng cùng thuộc một cửa sổ và hệ thống quan trắc, nên không phải sáu lần lặp độc lập.

### 5.2. Khoảng cách giữa MCAR và mất dữ liệu thực

MCAR giả định vị trí thiếu không phụ thuộc vào thời điểm hoặc trạng thái chuỗi. Mất kết nối cảm biến có thể tạo khuyết đoạn; lỗi đo có thể tập trung ở ngưỡng hoặc trạng thái nhất định. Vì vậy mặt nạ điểm ngẫu nhiên có thể đánh giá thấp sai số ở khoảng dài và không phản ánh cơ chế thiếu trong vận hành.

Phép nội suy hai phía sử dụng cả dữ liệu trước và sau điểm thiếu. Điều này hợp lý cho phục hồi lịch sử sau khi dữ liệu tương lai đã về, nhưng không phù hợp cho quyết định tức thời tại thời điểm chưa quan sát phần tương lai. `/home` chỉ hiển thị sai số benchmark dự báo; bài báo chứa cả đánh giá forecast và imputation. Ứng dụng không điền `null`, không thay quan trắc và không đưa giá trị dự đoán lên bản đồ.

### 5.3. Chất lượng nguồn

Nguồn có nhiều giá trị độ mặn âm, vốn cần chủ dữ liệu giải thích vì độ mặn vật lý không âm. Pipeline giữ nguyên chúng theo hợp đồng dữ liệu của dự án; không tự thay bằng 0 hay loại khỏi mẫu. Các metric vì thế đánh giá khả năng tái tạo đúng chuỗi đã lưu, chưa khẳng định giá trị đó hợp lệ về thủy văn. Cần lập cờ chất lượng, truy nguồn thiết bị/quy ước mã hóa, rồi chạy độ nhạy có và không có các điểm bị xác nhận lỗi—không âm thầm sửa dữ liệu gốc.

## 6. Hạn chế và kế hoạch kiểm chứng

1. **Không có khuyết tự nhiên trong holdout được chọn.** 660 target nội suy được tạo bằng mặt nạ tổng hợp.
2. **Chỉ có một cửa sổ hai tháng và một mặt nạ cố định.** Không đánh giá biến thiên theo mùa, năm, sự kiện mặn hoặc thiết bị.
3. **Chỉ đo MCAR điểm 25%.** Chưa thử các tỷ lệ khác, khuyết đoạn 2–72 giờ, mất kênh kéo dài, hay mặt nạ phụ thuộc trạng thái.
4. **Một seed cho mỗi mô hình.** Chưa có độ lệch chuẩn, bootstrap theo khối thời gian hoặc kiểm định khác biệt.
5. **Ngữ cảnh nội suy ngoại tuyến.** Mô hình có thể sử dụng các giá trị không bị che ở phía sau target; chưa đánh giá chế độ causal/online.
6. **Giới hạn huấn luyện.** Cả bốn mô hình forecast đạt checkpoint ở epoch 40/40; PatchTST và DLinear imputation ở 39/40, iTransformer ở 40/40. Cần xem lại learning curve, tăng giới hạn epoch hợp lý và chạy nhiều seed.
7. **Chất lượng salinity chưa được xác nhận.** Giá trị âm được bảo toàn nhưng chưa được thẩm định vật lý.

Vòng tiếp theo nên dùng rolling-origin theo nhiều đoạn thời gian, mặt nạ độc lập theo seed, nhiều độ dài khuyết, và bootstrap theo khối ngày/tuần. Cần báo đồng thời MAE/RMSE theo đơn vị, nMAE/nRMSE, bias, tỷ lệ sai số vượt ngưỡng do chuyên gia đặt, và thời gian suy luận/chi phí triển khai. Việc chọn checkpoint không được xem kết quả holdout cuối cùng; mọi ngưỡng chấp nhận cần chủ dữ liệu duyệt trước.

## 7. Kết luận

Nghiên cứu đánh giá riêng dự báo 24 giờ và nội suy điểm bị che trên cùng sáu chuỗi BaoDinh.csv. PatchTST dẫn đầu forecast theo nMAE (`0,6550`); TimesNet dẫn đầu imputation (`0,4564`). Theo trung bình thứ hạng hai tác vụ, top 3 đa tác vụ là PatchTST, TimesNet và DLinear; thứ hạng trung bình của TimesNet và DLinear hòa nhau, được phá hòa bằng nMAE trung bình hai tác vụ. Đây là ưu tiên cho nghiên cứu tiếp, không phải kết luận triển khai: benchmark chỉ có một cửa sổ và một seed, mọi checkpoint forecast chạm trần 40 epoch, còn DLinear đơn biến Stage 6 vẫn ở trạng thái `HOLD` theo cổng sai lệch. Trang `/home` tập trung hiển thị sai số dự báo; bài báo trình bày cả hai tác vụ. Không có API dự báo hoặc nội suy nào được bật và số đo quan trắc không bị thay thế.

## Tài liệu tham khảo

1. Haixu Wu, Tengge Hu, Yong Liu, Hang Zhou, Jianmin Wang, Mingsheng Long. [TimesNet: Temporal 2D-Variation Modeling for General Time Series Analysis](https://arxiv.org/abs/2210.02186). arXiv:2210.02186, 2022.
2. Yuqi Nie, Nam H. Nguyen, Phanwadee Sinthong, Jayant Kalagnanam. [A Time Series is Worth 64 Words: Long-term Forecasting with Transformers](https://arxiv.org/abs/2211.14730). arXiv:2211.14730, 2022.
3. Ailing Zeng, Muxi Chen, Lei Zhang, Qiang Xu. [Are Transformers Effective for Time Series Forecasting?](https://arxiv.org/abs/2205.13504). arXiv:2205.13504, 2022.
4. Yong Liu, Tengge Hu, Haoran Zhang, Haixu Wu, Shiyu Wang, Lintao Ma, Mingsheng Long. [iTransformer: Inverted Transformers Are Effective for Time Series Forecasting](https://arxiv.org/abs/2310.06625). arXiv:2310.06625, 2023.
5. Haixu Wu et al. [Deep Time Series Models: A Comprehensive Survey and Benchmark](https://arxiv.org/abs/2407.13278), arXiv:2407.13278; [mã nguồn Time-Series-Library](https://github.com/thuml/Time-Series-Library).

## Khả năng tái lập

- Báo cáo số liệu đầy đủ: `research_reproduction/results/tslib/benchmark.json`.
- Tóm tắt metric macro: `research_reproduction/results/tslib/summary.csv`.
- Dữ liệu UI chỉ gồm metric tổng hợp, thông tin protocol và cờ chất lượng; không gồm hàng quan trắc hoặc giá trị nội suy dự đoán.
- Export lại JSON cho ứng dụng: `python research_reproduction/scripts/export_imputation_dashboard.py`.
- Chạy lại các mô hình: `python research_reproduction/scripts/reproduce_tslib_benchmark.py` (CPU; cần dependency của checkout TSLib).
