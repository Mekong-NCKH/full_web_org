# Dự báo đa biến độ mặn và mực nước tại ba trạm cửa sông bằng Time-Series-Library: một tái lập theo chuỗi thời gian

## Tóm tắt

Nghiên cứu này xây dựng một thí nghiệm có thể chạy lại để đánh giá bốn mô hình dự báo đa biến được triển khai trong Time-Series-Library (TSLib): DLinear, PatchTST, iTransformer và TimesNet. Nguồn dữ liệu là `BaoDinh.csv`, giới hạn trong cửa sổ công khai từ 01/06/2024 đến 31/07/2024 (UTC+07), gồm sáu chuỗi theo giờ tại ba trạm có tọa độ đã xác minh: Bao Dinh, Go Cat và Vam Kenh. Mỗi lần dự báo dùng 96 giờ lịch sử để dự báo 24 giờ tiếp theo. Dữ liệu được chia theo thời gian; phần cuối được giữ làm holdout gồm 18 mốc không chồng lấp, tương đương 432 giờ được chấm cho mỗi chuỗi. Thước đo chính là nMAE macro, tính bằng cách chia MAE của từng chuỗi cho độ lệch chuẩn ước lượng chỉ từ đoạn huấn luyện rồi lấy trung bình đều sáu chuỗi.

PatchTST đạt nMAE macro 0,6550 và nRMSE macro 0,8977, thấp nhất trong bốn checkpoint TSLib của lần chạy này. DLinear đa biến đạt 0,7006/0,9575; iTransformer đạt 0,7182/0,9677; TimesNet đạt 0,7216/0,9627. PatchTST cải thiện nMAE khoảng 23,1% so với seasonal-naive 24 giờ, nhưng chỉ khoảng 1,9% so với baseline DLinear đơn biến đã chạy riêng. Vì đây là một seed, một nguồn, một cửa sổ hai tháng và một holdout, kết quả chỉ là bằng chứng thực nghiệm ban đầu; không có kiểm định ý nghĩa thống kê, tính mùa vụ nhiều năm, hay đánh giá vận hành. Dự báo theo giờ được xuất thành artifact tĩnh để `/home` đối chiếu dự báo với quan trắc lịch sử. Artifact này không phải dự báo trực tiếp hiện tại và không ghi đè dữ liệu quan trắc.

**Từ khóa:** dự báo chuỗi thời gian; độ mặn; mực nước; TSLib; PatchTST; kiểm định walk-forward; cửa sổ giữ lại.

## 1. Đặt vấn đề

Dự báo độ mặn và mực nước tại cửa sông có thể hỗ trợ phân tích diễn biến xâm nhập mặn. Tuy nhiên, một mô hình dự báo chỉ có ý nghĩa khi cách chia thời gian, tiền xử lý, chuẩn hóa, checkpoint, dự báo theo từng giờ và giới hạn sử dụng đều có thể kiểm tra. Một thứ hạng trên benchmark tổng hợp chưa cho biết mô hình đã dự báo ra giá trị nào, sai lệch ở trạm nào, hay kết quả có còn đúng khi thay đổi mùa và năm hay không.

Nghiên cứu này sử dụng mã mô hình công khai của TSLib, một thư viện cung cấp triển khai và khung đánh giá cho các tác vụ chuỗi thời gian, gồm dự báo và nội suy [1]. Bốn kiến trúc được chọn đại diện cho các giả thuyết khác nhau: phân rã tuyến tính (DLinear), attention theo patch và kênh độc lập (PatchTST), attention trên chiều biến (iTransformer), và khai thác biến thiên tuần hoàn bằng biểu diễn 2D (TimesNet) [2–5]. Mục tiêu không phải khẳng định kiến trúc nào tốt nhất nói chung, mà trả lời câu hỏi hẹp: với cửa sổ công khai hiện tại, protocol 96→24 giờ và sáu chuỗi được duyệt, các checkpoint này có dự báo tốt hơn những mốc so sánh đơn giản hay không?

Các đóng góp thực dụng gồm: (i) cố định phiên bản TSLib và hash dữ liệu/checkpoint; (ii) giữ chia tách theo thời gian và chuẩn hóa chỉ trên dữ liệu fit; (iii) lưu dự báo và quan trắc của từng khối holdout để người xem kiểm tra đường dự báo, không chỉ xem điểm tổng hợp; và (iv) tách rõ kết quả nghiên cứu ngoại tuyến khỏi dự báo vận hành.

## 2. Dữ liệu và phạm vi

### 2.1 Nguồn và biến

Nguồn phân tích là `Sanility_GIS_Monitoring/BaoDinh.csv`, cũng là nguồn được chỉ định cho demo công khai trong cấu hình dự án. Cửa sổ nghiên cứu được giữ đúng từ `2024-06-01 00:00` đến `2024-07-31 23:00` theo UTC+07. Có 1.464 timestamp theo giờ và ba trạm có tọa độ được xác minh. Mỗi trạm cung cấp độ mặn và mực nước, tạo thành ma trận sáu biến:

| Trạm | Chuỗi độ mặn | Chuỗi mực nước |
| --- | --- | --- |
| Bao Dinh | g/L ở nguồn; chuyển sang mg/L bằng hệ số 1.000 | m |
| Go Cat | g/L ở nguồn; chuyển sang mg/L bằng hệ số 1.000 | m |
| Vam Kenh | g/L ở nguồn; chuyển sang mg/L bằng hệ số 1.000 | m |

Trong cửa sổ này không có giá trị thiếu theo kiểm tra nguồn. Giá trị 0 và số âm được giữ nguyên; không nội suy dữ liệu trước khi huấn luyện. Một số số đo độ mặn âm hiện diện trong nguồn nhưng chưa có quy ước vật lý đã xác nhận, nên giữ lại để bảo toàn dữ liệu và không diễn giải chúng như một trạng thái đã được kiểm chứng.

### 2.2 Tính phù hợp và giới hạn đại diện

Chuỗi 1.464 giờ đủ để tạo cửa sổ đầu vào 96 giờ và các khối đầu ra 24 giờ, nhưng chỉ đại diện cho hai tháng. Nó không bao phủ đủ chu kỳ mùa, mùa khô/mưa, năm thủy văn, hoặc các sự kiện cực đoan. Sáu chuỗi cũng không đồng nghĩa với sáu trạm độc lập: mỗi timestamp có nhiều biến đo tại ba trạm, và các biến có thể tương quan. Vì vậy, mọi suy rộng ngoài cửa sổ và ba trạm này đều cần dữ liệu mới và một thiết kế đánh giá riêng.

## 3. Mô hình và giả thuyết

Đặt `X ∈ R^(T×6)` là ma trận quan trắc theo giờ. Với một mốc dự báo `t`, mô hình nhận `X[t−96:t]` và tạo `X̂[t:t+24]`. Mỗi mô hình dự báo đồng thời sáu kênh.

### 3.1 DLinear

DLinear dùng phép trung bình trượt để phân rã chuỗi thành thành phần xu thế và phần dao động, sau đó chiếu tuyến tính từng thành phần ra chân trời dự báo [2]. Đây là baseline học máy có cấu trúc đơn giản, hữu ích để kiểm tra liệu kiến trúc phức tạp có cần thiết trên chuỗi tương đối ngắn hay không. Bản đa biến trong thí nghiệm dùng chung đầu vào sáu kênh; kết quả DLinear đơn biến ở Stage 6 được giữ riêng làm baseline và không gộp với mô hình đa biến.

### 3.2 PatchTST

PatchTST gom các điểm liên tiếp thành patch trước khi attention, đồng thời dùng chung trọng số qua các kênh theo thiết kế channel-independent của bài gốc [3]. Patch biểu diễn một đoạn cục bộ thay vì một timestamp đơn lẻ. Trong thí nghiệm này, `patch_len=16`, `stride=8` và đầu vào dài 96 giờ.

### 3.3 iTransformer

iTransformer đảo cách tổ chức token: mỗi biến chuỗi được biểu diễn như một token, attention học quan hệ giữa các biến, còn mạng feed-forward biểu diễn phụ thuộc theo thời gian của từng biến [4]. Đây là giả thuyết có liên quan đến bài toán vì các trạm cùng đo độ mặn và mực nước, nhưng lợi ích phải được đo trên holdout chứ không suy ra từ cấu trúc kiến trúc.

### 3.4 TimesNet

TimesNet phát hiện các chu kỳ nổi bật và biến đổi chuỗi thành các biểu diễn 2D để mô hình hóa biến thiên trong chu kỳ và giữa các chu kỳ [5]. Một cửa sổ hai tháng có thể chứa dao động ngày, nhưng chưa đủ để kết luận mô hình đã nhận diện được mùa hoặc chu kỳ thủy văn dài hạn.

## 4. Thiết kế thực nghiệm

### 4.1 Chia thời gian và chống rò rỉ

Các timestamp được giữ theo thứ tự thời gian. 70% đầu tiên là vùng phát triển; 30% cuối là holdout. Trong vùng phát triển, 80% đầu được dùng để fit và 20% sau để chọn checkpoint theo loss validation. Thống kê chuẩn hóa (trung bình và độ lệch chuẩn riêng cho từng biến) chỉ được fit trên đoạn fit. Không dùng timestamp holdout để chọn checkpoint hoặc chuẩn hóa.

Mỗi cửa sổ huấn luyện được trượt theo giờ, có lookback 96 và horizon 24. Mỗi mô hình được huấn luyện với Adam, learning rate `1e-4`, batch size 32, tối đa 40 epoch, patience 7; loss forecast là MSE trên nhãn đã chuẩn hóa. Cấu hình chung gồm `d_model=32`, `d_ff=64`, hai encoder layer, bốn attention head khi kiến trúc sử dụng chúng, dropout 0,05, `moving_avg=25`; TSLib-specific settings như patch length được nêu ở phần tương ứng. Chạy sử dụng CPU, thuật toán xác định và seed gốc `20261111`; seed của mỗi mô hình được suy ra theo chỉ số mô hình.

### 4.2 Rolling-origin holdout

Holdout bắt đầu tại `2024-07-13 16:00` UTC+07 và dài 440 giờ. Mỗi dự báo bao phủ 24 giờ, stride cũng 24 giờ, nên có 18 khối và 432 điểm được chấm trên mỗi chuỗi; 8 giờ cuối không đủ một khối nên không đưa vào forecast score. Sau khi kết thúc từng khối, quan trắc thật của khối đó được phép đi vào 96 giờ ngữ cảnh của mốc kế tiếp. Do đó, đây là rolling-origin backtest với mô hình và trọng số giữ nguyên, không phải một dự báo tự hồi quy liên tục 432 giờ mà không nhận thêm quan trắc.

### 4.3 Chỉ số

Với sai số `e = prediction − observation`, MAE và RMSE được tính ở đơn vị gốc của từng chuỗi. Bias là trung bình của `e`. Vì độ mặn mg/L và mực nước m có thang đo khác nhau, thứ hạng tổng thể dùng nMAE và nRMSE, mỗi sai số chia cho độ lệch chuẩn tương ứng của đoạn fit. Kết quả macro là trung bình đều trên sáu chuỗi; do đó mỗi chuỗi có trọng số như nhau, không phụ thuộc biên độ hoặc đơn vị. MAPE không dùng vì dữ liệu có thể bằng 0 hoặc âm.

## 5. Kết quả

### 5.1 So sánh tổng thể

| Mô hình | nMAE macro ↓ | nRMSE macro ↓ | Epoch checkpoint / tối đa |
| --- | ---: | ---: | ---: |
| PatchTST | **0,6550** | **0,8977** | 40 / 40 |
| DLinear đa biến | 0,7006 | 0,9575 | 40 / 40 |
| iTransformer | 0,7182 | 0,9677 | 40 / 40 |
| TimesNet | 0,7216 | 0,9627 | 40 / 40 |
| DLinear đơn biến (Stage 6) | 0,6676 | 0,9098 | thí nghiệm riêng |
| Daily seasonal naive 24h | 0,8513 | 1,2699 | không huấn luyện |
| Persistence | 1,0447 | 1,4818 | không huấn luyện |

PatchTST có nMAE macro thấp hơn 23,1% so với daily seasonal naive và thấp hơn 37,3% so với persistence trong protocol này. So với DLinear đơn biến đã được đánh giá riêng, chênh lệch nMAE là khoảng 1,9%; chưa có nhiều seed hoặc bootstrap theo block để đánh giá độ bất định của chênh lệch nhỏ này. So sánh giữa DLinear đa biến và DLinear đơn biến cũng không phải ablation sạch vì cấu hình, tập huấn luyện và pipeline Stage 6 là một thí nghiệm riêng.

### 5.2 Sai số chuẩn hóa theo trạm và biến

| Chuỗi | DLinear | PatchTST | iTransformer | TimesNet |
| --- | ---: | ---: | ---: | ---: |
| Bao Dinh · độ mặn | 0,8003 | **0,7488** | 0,8194 | 0,8057 |
| Bao Dinh · mực nước | 0,5338 | **0,4907** | 0,5417 | 0,5600 |
| Go Cat · độ mặn | 0,9114 | **0,8423** | 0,9301 | 0,9102 |
| Go Cat · mực nước | 0,5365 | **0,4944** | 0,5464 | 0,5681 |
| Vam Kenh · độ mặn | 0,8199 | **0,7505** | 0,8275 | 0,8381 |
| Vam Kenh · mực nước | 0,6016 | 0,6035 | 0,6444 | **0,6476** |

PatchTST có nMAE thấp nhất ở năm trong sáu chuỗi. Ở Vam Kenh · mực nước, DLinear nhỉnh hơn một khoảng rất nhỏ (0,6016 so với 0,6035). Đây là chênh lệch của một holdout duy nhất; không đủ căn cứ để nói PatchTST luôn vượt DLinear trên chuỗi này.

### 5.3 Sai số PatchTST ở đơn vị quan trắc

| Chuỗi | MAE | RMSE | Bias |
| --- | ---: | ---: | ---: |
| Bao Dinh · độ mặn (mg/L) | 48,3696 | 63,3042 | +1,5813 |
| Bao Dinh · mực nước (m) | 0,2249 | 0,3095 | +0,0023 |
| Go Cat · độ mặn (mg/L) | 280,8273 | 369,2894 | +18,6686 |
| Go Cat · mực nước (m) | 0,2501 | 0,3482 | +0,0013 |
| Vam Kenh · độ mặn (mg/L) | 2.418,9034 | 3.164,1865 | +136,6102 |
| Vam Kenh · mực nước (m) | 0,3596 | 0,5680 | +0,0013 |

Sai số độ mặn tại Vam Kenh lớn hơn nhiều theo đơn vị tuyệt đối, nhưng chuẩn hóa theo độ lệch chuẩn fit giúp so sánh macro mà không cộng trực tiếp mg/L với mét. Bias dương cho biết trung bình dự báo cao hơn quan trắc trong holdout; riêng Vam Kenh độ mặn, RMSE cao hơn MAE đáng kể, phản ánh một số sai số lớn có ảnh hưởng mạnh. Không thể từ những chỉ số gộp này xác định thời điểm hoặc nguyên nhân vật lý của các sai số; cần xem từng khối dự báo và đối chiếu dữ liệu gốc.

### 5.4 Đường dự báo theo giờ

`Web/public/research/forecast-backtest.json` chứa 18 origin và các dự báo 24 giờ của bốn mô hình trên sáu chuỗi. Trang `/home` cho phép chọn trạm, biến, thời điểm origin và mô hình; đường quan trắc thật được tải cho khoảng 24 giờ đã chọn qua Monitoring API. Artifact dự báo được tạo lại bằng inference từ các checkpoint đã kiểm tra hash; ứng dụng không gọi endpoint dự báo và không thêm giá trị vào bản đồ quan trắc.

Giá trị dự báo có thể âm vì mô hình học trên dữ liệu gốc đã chuẩn hóa ngược, không có ràng buộc miền vật lý. Các điểm âm không bị cắt hoặc biến đổi ngầm. Với độ mặn, diễn giải cần tính đến các giá trị âm vốn đã tồn tại trong nguồn và chất lượng đo chưa được xác minh. Đây là lý do artifact giữ nguyên output mô hình và cần đánh giá theo quy tắc chất lượng đã được chủ dữ liệu phê duyệt trước khi cân nhắc vận hành.

## 6. Thảo luận

### 6.1 Điều gì được hỗ trợ bởi kết quả

Trong cấu hình cố định này, PatchTST là mô hình có sai số macro thấp nhất trong bốn mô hình TSLib được chạy và tốt hơn rõ hơn so với persistence và seasonal-naive. Đường dự báo theo giờ cho phép kiểm tra xem mức cải thiện tổng hợp có tương ứng với từng khối cụ thể hay bị chi phối bởi một số thời đoạn. Mã nguồn, commit, hash dữ liệu và checkpoint cho phép người khác tái tạo cùng dự báo mà không cần huấn luyện lại để vẽ trang web.

### 6.2 Điều gì chưa được chứng minh

Thí nghiệm chưa chứng minh PatchTST tốt nhất ngoài cửa sổ này, cải thiện dự báo cảnh báo, hoặc phù hợp sử dụng ra quyết định. Không có kiểm định theo năm/mùa, dữ liệu trạm ngoài mẫu, khoảng tin cậy, bootstrap block, kiểm định nhiều seed, khoảng dự báo, hay đánh giá chi phí false alarm/miss. Tất cả bốn checkpoint forecast đạt epoch tốt nhất 40/40, tức chạm giới hạn epoch; lịch sử loss giảm không chứng minh đã hội tụ. Cần thử ngân sách huấn luyện phù hợp hơn và báo cáo độ nhạy trước khi diễn giải thứ hạng như ổn định.

### 6.3 Dữ liệu mới cần có để tiến gần vận hành

Muốn dự báo hiện hành, cần cập nhật chuỗi quan trắc đã kiểm định đến hiện tại, đồng bộ timestamp và đơn vị, trạng thái cảm biến, tọa độ/trạm, và chu kỳ phát hành. Khi có đủ dữ liệu, nên dùng nhiều năm để thiết kế rolling-origin qua mùa, cố định test cuối cùng trước tuning, so sánh với baseline thủy văn và mô hình hiện hành, đánh giá nhiều seed/block, hiệu chỉnh khoảng dự báo, kiểm tra drift và có ngưỡng chấp nhận do chủ dữ liệu phê duyệt. Bài này không tự bật API dự báo vì các điều kiện đó chưa được đáp ứng.

## 7. Khả năng tái lập

- **Mã thư viện:** Git submodule `Time-Series-Library`, commit `4e938a1767106324dd753b2a44832bf870a0252e`; URL upstream được ghi trong `.gitmodules`.
- **Tệp nguồn:** `Sanility_GIS_Monitoring/BaoDinh.csv`; SHA-256 được lưu trong `results/tslib/benchmark.json` và xác minh trước khi xuất web artifact.
- **Huấn luyện:** `scripts/reproduce_tslib_benchmark.py`; lưu protocol, loss lịch sử, số liệu và checkpoint.
- **Xuất đường dự báo:** `scripts/export_tslib_forecast_backtest.py`; xác minh hash nguồn, commit thư viện, hash artifact và chuẩn hóa; inference CPU xác định.
- **Dữ liệu dự báo cho web:** `Web/public/research/forecast-backtest.json`; chỉ các trạm được duyệt và cửa sổ nghiên cứu đã chọn. Quan trắc thật được đọc theo API contract hiện hành.
- **Giao diện:** panel nghiên cứu trên `/home`; không cung cấp dự báo qua API và không ghi các dự đoán vào bảng quan trắc.

Để khởi tạo thư viện và tạo lại artifact dự báo theo giờ:

```powershell
git submodule update --init --recursive Time-Series-Library
python -m pip install -r research_reproduction/requirements-tslib-inference.txt
python research_reproduction/scripts/export_tslib_forecast_backtest.py
```

Để tái huấn luyện và tái tạo benchmark từ đầu, xem `research_reproduction/README.md` và chạy `reproduce_tslib_benchmark.py` trước bước xuất. Kết quả hiện hành của website được đóng gói cùng mã nguồn khi build Vite; nó không truy vấn cơ sở dữ liệu.

## 8. Kết luận

Với 1.464 giờ từ hai tháng dữ liệu công khai, protocol 96 giờ vào/24 giờ ra và 18 rolling origins, PatchTST cho nMAE và nRMSE macro thấp nhất trong bốn mô hình TSLib của lần chạy này. Chênh lệch so với baseline naive đáng khảo sát thêm; chênh lệch so với DLinear đơn biến nhỏ và chưa có lượng hóa bất định. Bằng chứng hiện tại phù hợp để trình bày một thí nghiệm nghiên cứu có thể kiểm tra trên web, không phù hợp để phát hành dự báo vận hành. Dự báo theo giờ trên `/home` là backtest 2024, được gắn nhãn rõ và tách biệt với quan trắc thật.

## Tài liệu tham khảo

1. THUML. *Time-Series-Library: A Library for Advanced Deep Time Series Models for General Time Series Analysis*. Mã nguồn và license MIT: <https://github.com/thuml/Time-Series-Library>.
2. Zeng, A., Chen, M., Zhang, L., & Xu, Q. (2023). *Are Transformers Effective for Time Series Forecasting?* AAAI. <https://arxiv.org/abs/2205.13504>.
3. Nie, Y., Nguyen, N. H., Sinthong, P., & Kalagnanam, J. (2023). *A Time Series is Worth 64 Words: Long-term Forecasting with Transformers*. ICLR. <https://arxiv.org/abs/2211.14730>.
4. Liu, Y., Hu, T., Zhang, H., Wu, H., Wang, S., Ma, L., & Long, M. (2024). *iTransformer: Inverted Transformers Are Effective for Time Series Forecasting*. ICLR. <https://arxiv.org/abs/2310.06625>.
5. Wu, H., Hu, T., Liu, Y., Zhou, H., Wang, J., & Long, M. (2023). *TimesNet: Temporal 2D-Variation Modeling for General Time Series Analysis*. ICLR. <https://arxiv.org/abs/2210.02186>.
