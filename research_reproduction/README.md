# Báo cáo tái lập nghiên cứu chuỗi thời gian Mekong

## Kết luận nhanh

Đã kiểm tra lại hai bài nghiên cứu có trong workspace và chạy một benchmark dự báo/nội suy bằng các mô hình của Time-Series-Library (TSLib) trên bộ dữ liệu hiện được duyệt cho demo công khai.

| Nhánh nghiên cứu | Kết quả tái lập |
| --- | --- |
| Quan trắc và GIS, Chi et al. | Đối chiếu lại được hồ sơ dữ liệu. Không thể tính lại các chỉ số đồng thuận với người vận hành và an toàn vì thiếu nhãn quyết định cùng một số tham số thuật toán. |
| PI-STOF, phân rã chuỗi mực nước | Chạy lại lưới tham số và bảng ablation trên mẫu 2020 đi kèm. Tái tạo được cấu hình tốt nhất và các bảng của mẫu; không tái tạo được số liệu headline của toàn bộ 49.680 giờ vì chuỗi gốc nhiều năm bị hạn chế và không có trong workspace. |
| TSLib, dự báo và nội suy | Huấn luyện lại DLinear, PatchTST, iTransformer, TimesNet trên sáu chuỗi hiện có. Đây là benchmark thích nghi theo dữ liệu Mekong, không phải chạy lại các bảng benchmark gốc trên ETTh hoặc các bộ dữ liệu chuẩn khác. |

TSLib là thư viện/mã nguồn bao phủ dự báo, nội suy, phát hiện bất thường và phân loại; bài survey/benchmark liên quan là *Deep Time Series Models: A Comprehensive Survey and Benchmark*. Kết quả bên dưới chỉ khẳng định các phép chạy trên cấu hình và dữ liệu được nêu tại đây, không khẳng định thứ hạng tổng quát giữa các mô hình. [Kho TSLib](https://github.com/thuml/Time-Series-Library), [bài survey/benchmark](https://arxiv.org/abs/2407.13278).

Nguồn PDF trong workspace: [bài quan trắc/GIS](../Sanility_GIS_Monitoring/Chi_et_al___IAAA_2026_Paper.pdf), [bài PI-STOF](../PI-STOF-Estuarine-Salinity-main/papers/preprint/PI-STOF_Preprint.pdf).

## 1. Bài quan trắc và GIS

Tệp nguồn `Sanility_GIS_Monitoring/converted_long_format.csv` có 52.330 dòng, 5.815 thời điểm riêng biệt trong 243 ngày, chín luồng trạm và tám tên trạm sau chuẩn hóa; tệp tọa độ có bảy bản ghi. Hai luồng Go Cat trùng tên chuẩn hóa và cùng thời điểm, tạo 5.814 khóa trạm-thời điểm trùng; 5.812 khóa có độ mặn khác nhau. Khi đánh giá bỏ-một-trạm, phải loại đồng thời mọi luồng của cùng một cổng vật lý để tránh rò rỉ dữ liệu từ vị trí trùng tọa độ.

Bài báo nêu 2.160 quyết định, độ đồng thuận người vận hành tăng từ 68,2% lên 79,5%, tỷ lệ vi phạm ngưỡng giảm từ 12,4% xuống 6,7%, và switching rate từ 0,31 xuống 0,22. Đây vẫn là số do bài báo báo cáo, chưa tái tính độc lập: workspace không có nhãn quyết định/nhật ký vận hành, và chưa đủ mô tả để tái tạo risk score, IDW, ngưỡng địa phương và quy tắc lọc ra đúng 2.160 quyết định.

**Đánh giá:** hồ sơ số lượng và độ phủ dữ liệu có thể kiểm tra lại; các kết luận về chất lượng quyết định và an toàn chưa thể xác minh từ bằng chứng hiện có. Không dùng các chỉ số headline này làm bằng chứng hiệu quả đã được xác nhận.

## 2. Bài PI-STOF về phân rã chuỗi thời gian

Mã nguồn công bố kèm bài chạy trên `raw_sample.csv` năm 2020 gồm 8.784 giờ; có 4.040 giá trị quan sát, 4.744 giá trị khuyết (54,0073%) và khoảng khuyết dài nhất tám giờ. Pipeline điền khuyết tuyến tính/PCHIP trước khi phân rã. Chạy lại lưới 20 cấu hình và bảng ablation cho kết quả:

| Cấu hình | w25 | w354 | Loss tổng | Leakage | Orthogonality | Baseflow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| MSTL mặc định | 11 | 15 | 0,081246 | 0,040305 | 0,031956 | 0,008986 |
| MSTL, trend cố định 4381 | 11 | 15 | 0,078603 | 0,038951 | 0,031150 | 0,008502 |
| PI-STOF tối ưu trên mẫu | 7 | 91 | 0,033886 | 0,006171 | 0,018937 | 0,008778 |

Mức giảm loss trên mẫu là 56,8897% so với trend cố định và 58,2921% so với MSTL mặc định. Cấu hình tối ưu khớp `w25=7, w354=91` trong bài, nhưng loss 0,033886 và leakage 0,006171 không khớp headline toàn kỳ 0,0181 và 0,0036. README của dự án PI-STOF cũng lưu ý các giá trị tuyệt đối khác giữa mẫu một năm và chuỗi 49.680 giờ do độ phân giải phổ và ảnh hưởng biên.

**Đánh giá tính hợp lệ:** ý tưởng phân rã các thành phần triều trước khi dự báo là hợp lý để khảo sát cấu trúc tín hiệu, nhưng tối thiểu hóa hàm mục tiêu đã định nghĩa chỉ chứng minh phù hợp với hàm đó. Tối ưu trên toàn chuỗi rồi báo cùng loss không tạo ra kiểm định ngoài mẫu; kết quả còn nhạy với cửa sổ thời gian, điền khuyết và lựa chọn trạm. Việc thuật toán chạy xác định không loại bỏ bất định do lấy mẫu hay chọn giai đoạn, nên vẫn cần phân tích độ nhạy và đánh giá theo thời gian. Bản PI-STOF tự ghi rõ lợi ích đối với dự báo sâu là công việc tương lai. Vì vậy chưa có bằng chứng rằng phân rã này cải thiện dự báo.

**Khả năng áp dụng vào dữ liệu hiện tại:** chuỗi công khai được chọn chỉ dài 1.464 giờ (hai tháng), ngắn hơn cửa sổ trend 4.381 giờ; nó cũng không chứa cột mục tiêu Xuan Hoa mà bài PI-STOF dùng. Không nên chuyển nguyên tham số/phát biểu của bài sang dữ liệu này. Cần chuỗi mực nước nhiều năm, tách train/validation/test theo thời gian trước khi chọn tham số, kiểm tra độ nhạy với cách điền khuyết, rồi đo tác động lên dự báo so với baseline.

## 3. TSLib trên dữ liệu công khai hiện tại

### Dữ liệu và protocol

- Nguồn duy nhất: `Sanility_GIS_Monitoring/BaoDinh.csv`, đúng cửa sổ UTC+07:00 từ 2024-06-01 00:00 đến 2024-07-31 23:00.
- Chỉ ba trạm có tọa độ đã xác minh: Bao Dinh, Go Cat, Vam Kenh. Sáu kênh gồm độ mặn và mực nước tại từng trạm.
- Mỗi kênh có đủ 1.464 giá trị trong cửa sổ. Giữ nguyên số 0 và số âm; độ mặn được đổi từ g/L sang mg/L bằng cách nhân 1.000. Không điền giá trị nguồn.
- Dùng commit TSLib `4e938a1767106324dd753b2a44832bf870a0252e`; huấn luyện trên CPU, seed `20261111`, lookback 96 giờ, forecast horizon 24 giờ. Cấu hình chung: `d_model=32`, `d_ff=64`, hai encoder layers, bốn heads, Adam `1e-4`, batch 32, tối đa 40 epoch, early stopping patience 7.
- Chia theo thời gian: 70% đầu để phát triển, 30% cuối làm holdout; 80% của phần phát triển để fit và 20% để chọn checkpoint. Chuẩn hóa từng kênh chỉ bằng trung bình/độ lệch chuẩn của phần fit.
- Forecast chấm theo 18 khối 24 giờ không chồng lấn trên mỗi kênh, tổng 432 điểm/kênh; tám giờ cuối không đủ một khối nên không chấm.
- Nội suy là thí nghiệm che nhân tạo 25% điểm MCAR trên holdout, 110 điểm/kênh; mọi mô hình nhận cùng mặt nạ. Nguồn gốc không có giá trị khuyết nên đây là phép thử khôi phục điểm bị che, không phải xác nhận khả năng xử lý lỗi mất dữ liệu thực tế.

### Forecast 24 giờ

Chỉ số nMAE/nRMSE là MAE/RMSE chia cho độ lệch chuẩn của từng kênh tính trên tập train; cột kết quả là trung bình macro không trọng số của sáu kênh, để so sánh độ mặn và mực nước khác đơn vị.

| Mô hình | nMAE ↓ | nRMSE ↓ |
| --- | ---: | ---: |
| Persistence | 1,0447 | 1,4818 |
| Daily seasonal naive 24h | 0,8513 | 1,2699 |
| DLinear đơn biến (Stage 6) | 0,6676 | 0,9098 |
| DLinear đa biến | 0,7006 | 0,9575 |
| PatchTST đa biến | **0,6550** | **0,8977** |
| iTransformer đa biến | 0,7182 | 0,9677 |
| TimesNet đa biến | 0,7216 | 0,9627 |

PatchTST có sai số chuẩn hóa thấp nhất trong lần chạy này. Tuy nhiên lợi thế so với DLinear đơn biến nhỏ; mỗi mô hình chỉ có một cửa sổ holdout ngắn, không có mùa độc lập để đánh giá tổng quát hóa.

### Nội suy điểm bị che

| Mô hình | nMAE ↓ | nRMSE ↓ |
| --- | ---: | ---: |
| Trung bình train | 0,7921 | 1,1422 |
| Nội suy tuyến tính | 0,9106 | 1,2465 |
| DLinear | 0,7087 | 1,0476 |
| PatchTST | 0,6753 | 1,0041 |
| iTransformer | 0,7732 | 1,1345 |
| TimesNet | **0,4564** | **0,7301** |

TimesNet đứng đầu ở mặt nạ MCAR cụ thể này. Điều đó không chứng minh ưu thế với khoảng mất liên tục, mất có hệ thống, dữ liệu thiếu sẵn trong vận hành, hay trạm/năm khác; nên xem đây là kết quả thử nghiệm ban đầu.

### Quyết định sử dụng

Các mô hình TSLib chưa đủ điều kiện phục vụ API công khai. Kết quả chỉ dựa trên một cửa sổ hai tháng, holdout duy nhất, chưa có ngưỡng chấp nhận được chủ dữ liệu phê duyệt và chưa có kiểm tra mùa độc lập. Tất cả trọng số là artifact nghiên cứu. Không kết nối cơ sở dữ liệu, không ghi forecast rows, không bật endpoint dự báo/nội suy.

## Tệp kết quả

- `results/paper-audit.json`: audit định lượng và giới hạn tái lập của hai bài báo địa phương.
- `results/pistof_sample_2020/tables/grid_search.csv`: lưới PI-STOF 20 cấu hình trên mẫu 2020.
- `results/pistof_sample_2020/tables/Table_3_Ablation.csv`: bảng ablation PI-STOF.
- `results/tslib/benchmark.json`: protocol, lịch sử train, điểm theo trạm/kênh, so sánh baseline và SHA-256 của checkpoint.
- `results/tslib/summary.csv`: so sánh macro nMAE/nRMSE.
- `results/tslib/artifacts/`: tám checkpoint TSLib (bốn mô hình, hai tác vụ). Các checkpoint không được đăng ký hoặc phục vụ qua API.
- `papers/imputation-assessment-mekong.md`: bản thảo khoa học phân tích protocol, kết quả, top 3 và giới hạn áp dụng.
- Mục nghiên cứu được nhúng trong `/home#forecast-research`: giao diện tập trung vào so sánh dự báo theo mô hình, trạm và chỉ tiêu; nút tải bản thảo chứa đánh giá cả dự báo lẫn nội suy và lựa chọn top 3 đa tác vụ. Giao diện chỉ hiển thị metric tổng hợp, không ghi đè hoặc điền giá trị trong bản đồ quan trắc.
- `Web/public/research/imputation-benchmark.json`: artifact metric-only mà mục nghiên cứu ở `/home` đọc; gồm sai số dự báo và nội suy, không chứa hàng quan trắc, giá trị dự đoán hay dữ liệu ngoài ba trạm được duyệt.
- `scripts/audit_existing_papers.py`, `scripts/reproduce_tslib_benchmark.py`, `scripts/summarize_tslib_benchmark.py`, `scripts/export_imputation_dashboard.py`: mã audit, tái chạy mô hình, tổng hợp điểm và xuất dữ liệu nghiên cứu cho giao diện.

Không giữ file dòng-đến-dòng đã tiền xử lý của mẫu PI-STOF; file scratch được xóa sau khi chạy, chỉ để lại số liệu tổng hợp.

## Chạy lại

Các bước đều offline. TSLib cần PyTorch, NumPy và các dependency của checkout TSLib. PI-STOF dùng dependency trong `PI-STOF-Estuarine-Salinity-main/requirements.txt`. Chạy Stage 5–7 từ backend để tái tạo baseline và cổng đánh giá hiện hữu:

```powershell
Set-Location "C:\disk D\full_web_org\Web\BE-Mekong-main"
python scripts/stage5-forecast-baseline.py
python scripts/stage6-dlinear-experiment.py
python scripts/stage7-forecast-promotion-gate.py
```

Chạy audit và benchmark TSLib từ thư mục gốc:

```powershell
Set-Location "C:\disk D\full_web_org"
python research_reproduction/scripts/audit_existing_papers.py
python research_reproduction/scripts/reproduce_tslib_benchmark.py
python research_reproduction/scripts/summarize_tslib_benchmark.py
python research_reproduction/scripts/export_imputation_dashboard.py
```

Script tổng hợp luôn ghi `summary.csv`; nếu môi trường có Matplotlib thì sẽ tạo thêm `benchmark_summary.png`.

Để chạy lại mẫu PI-STOF trên Windows, cần cài `requirements.txt` của dự án. Lệnh dưới đây dùng file đã tiền xử lý trong thư mục tạm của hệ điều hành, xuất các bảng/figures tổng hợp vào `research_reproduction`, rồi xóa file dòng-đến-dòng trong mọi trường hợp:

```powershell
Set-Location "C:\disk D\full_web_org\PI-STOF-Estuarine-Salinity-main"
$scratch = Join-Path $env:TEMP "pistof-clean-sample.csv"
try {
    python -m src.data_preprocessing --input data/sample/raw_sample.csv --output $scratch
    if ($LASTEXITCODE -ne 0) { throw "PI-STOF preprocessing failed" }
    python -m src.pi_stof_engine --input $scratch --output ..\research_reproduction\results\pistof_sample_2020\tables\grid_search.csv
    if ($LASTEXITCODE -ne 0) { throw "PI-STOF grid search failed" }
    python -m src.evaluation --input $scratch --figures_dir ..\research_reproduction\results\pistof_sample_2020\figures --tables_dir ..\research_reproduction\results\pistof_sample_2020\tables
    if ($LASTEXITCODE -ne 0) { throw "PI-STOF evaluation failed" }
} finally {
    if (Test-Path -LiteralPath $scratch) { Remove-Item -LiteralPath $scratch -Force }
}
```

## Ranh giới kết luận

Đây là tái lập cục bộ dựa trên các tệp hiện có, không phải kiểm định độc lập của nhóm tác giả, không phải xác nhận số liệu vận hành và không phải chứng nhận mô hình. Mọi giới hạn dữ liệu, giá trị âm/0, nguồn bị trùng và thiếu nhãn được giữ nguyên hoặc nêu rõ; không suy diễn dữ liệu không có thành kết quả xác nhận.
