export const MOCK_VIDEO = {
  title: "Hướng dẫn quản lý thời gian hiệu quả cho lập trình viên",
  channel: "Dev Viet Nam",
  thumbnail: null, // placeholder
  duration: "15:42",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

export const MOCK_TRANSCRIPT = `Xin chào các bạn, hôm nay mình sẽ chia sẻ với các bạn về cách quản lý thời gian hiệu quả dành riêng cho lập trình viên. Đây là một chủ đề mà mình đã nghiên cứu và áp dụng trong suốt 5 năm làm việc trong ngành công nghệ.

Trước hết, mình muốn nói về vấn đề mà hầu hết lập trình viên đều gặp phải. Đó là chúng ta thường bị cuốn vào code và quên mất thời gian. Nhiều khi bắt đầu fix một bug nhỏ mà khi ngẩng đầu lên thì đã 3 tiếng trôi qua. Điều này không xấu nhưng nếu không kiểm soát được thì sẽ ảnh hưởng đến cả dự án.

Phương pháp đầu tiên mà mình muốn giới thiệu là Pomodoro Technique. Cách làm rất đơn giản, bạn làm việc tập trung trong 25 phút, sau đó nghỉ 5 phút. Sau 4 chu kỳ thì nghỉ dài 15-30 phút. Nghe có vẻ đơn giản nhưng hiệu quả cực kỳ. Mình đã thử và năng suất tăng khoảng 40%.

Phương pháp thứ hai là Time Blocking. Bạn chia ngày làm việc thành các khối thời gian cụ thể. Ví dụ sáng từ 8h đến 10h là code feature mới, 10h đến 11h là review code của team, 11h đến 12h là fix bug. Buổi chiều thì 1h đến 3h là tiếp tục code, 3h đến 4h là meeting, 4h đến 5h là viết documentation.

Điều quan trọng thứ ba là biết nói không. Mình biết điều này nghe có vẻ khó nhưng thực sự rất cần thiết. Không phải meeting nào cũng cần bạn tham gia. Không phải message Slack nào cũng cần reply ngay lập tức. Hãy set "Do Not Disturb" khi cần tập trung.

Tiếp theo là việc sử dụng công cụ phù hợp. Mình recommend các bạn dùng Todoist hoặc Notion để quản lý task. Dùng Toggl để track thời gian. Và quan trọng nhất là dùng Git một cách có kỷ luật, commit nhỏ và thường xuyên để không bị mất code.

Một điểm nữa mà nhiều bạn hay bỏ qua là sleep và exercise. Nghe có vẻ không liên quan nhưng thực tế khi bạn ngủ đủ 7-8 tiếng và tập thể dục 30 phút mỗi ngày thì não bộ hoạt động tốt hơn rất nhiều. Mình đã thử và thấy số bug mình tạo ra giảm đáng kể.

Cuối cùng, mình muốn nhấn mạnh về deep work. Đây là khái niệm của Cal Newport. Ý tưởng là bạn cần có những khoảng thời gian dài không bị gián đoạn để làm những công việc đòi hỏi tư duy cao. Đối với lập trình viên, đó là lúc thiết kế kiến trúc, giải quyết vấn đề phức tạp, hoặc học công nghệ mới.

Tóm lại, quản lý thời gian không phải là làm nhiều hơn mà là làm đúng việc vào đúng thời điểm. Hy vọng những chia sẻ này sẽ giúp ích cho các bạn. Nếu thấy hữu ích thì like và subscribe kênh nhé. Hẹn gặp lại các bạn trong video tiếp theo!`;

export const MOCK_SUMMARY = {
  shortSummary:
    "Video chia sẻ 6 phương pháp quản lý thời gian hiệu quả dành cho lập trình viên, bao gồm Pomodoro, Time Blocking, biết nói không, sử dụng công cụ phù hợp, chăm sóc sức khỏe, và deep work theo Cal Newport.",
  keyPoints: [
    "Pomodoro Technique: Thay vì làm việc kiệt sức trong thời gian dài, hãy chia công việc ra làm 25 phút tập trung cao độ, sau đó nghỉ 5 phút. Sau 4 chu kỳ như vậy thì nghỉ dài 15-30 phút. Việc này giúp não bộ duy trì được sự minh mẫn và tăng năng suất khoảng 40%.",
    "Time Blocking: Chia cấu trúc ngày làm việc của bạn thành các khối thời gian cố định cho từng loại công việc cụ thể. Việc nhóm các task giống nhau (như code, review PR, fix bug, họp hành) vào một block nhất định sẽ giảm thiểu lãng phí context-switching.",
    "Bí quyết nói 'Không': Nhận biết đâu là việc ưu tiên và đâu là thứ làm xao nhãng. Không phải cuộc họp nào bạn cũng cần phải có mặt, và hãy thiết lập chế độ Do Not Disturb trên Slack/Teams khi thực sự cần không gian để xử lý logic phức tạp.",
    "Công cụ hỗ trợ: Việc quản lý bằng đầu óc chưa bao giờ là an toàn, hãy sử dụng Todoist hay Notion để hệ thống hoá task. Đặc biệt, hãy áp dụng kỷ luật dùng Git với các commit nhò và chạy code thường xuyên.",
    "Sleep & Exercise (Sức khoẻ cốt lõi): Một cơ thể mệt mỏi sẽ đẻ ra những hàm code đầy lỗi. Ngủ đủ 7-8 tiếng và duy trì vận động thể chất 30 phút mỗi ngày đóng vai trò quan trọng trong việc giữ não nhạy bén và giảm số bug tự sinh.",
    "Deep Work (Làm việc sâu): Dựa trên khái niệm của Cal Newport, bạn cần tạo ra những vùng thời gian cực kỳ tĩnh lặng, hoàn toàn không bị gián đoạn, từ đó mới có thể giải quyết được các kiến trúc hệ thống phức tạp và công nghệ chuyên sâu."
  ],
  actionItems: [
    "Áp dụng Pomodoro Technique bắt đầu từ ngày mai",
    "Tạo Time Blocking schedule cho tuần tới",
    "Cài đặt Todoist hoặc Notion để quản lý task",
    "Cài Toggl để theo dõi thời gian làm việc",
    "Set Do Not Disturb schedule trên Slack",
    "Đặt mục tiêu ngủ đủ 7 tiếng mỗi đêm",
  ],
  generationTime: "1.2",
};

export const TRANSCRIPT_LOADING_STEPS = [
  "Đang kiểm tra link YouTube...",
  "Đang lấy subtitle...",
  "Đang tạo transcript...",
];

export const SUMMARY_LOADING_STEPS = [
  "Đang phân tích transcript...",
  "Đang tạo bản tóm tắt...",
];
