// 模拟用的“标准玩家”假设：每一关从进关到出关的成长水平。
// 这些数值不是游戏数据，只是平衡分析的前提；可以按实际测试的感受调整，或在命令行用 --mana、--level 等参数覆盖。
// 写成 [进关, 出关] 时按节点进度线性插值（第一个节点取进关值，最终首领取出关值）；写成单个数字表示整关不变。
//   heroLevel   英雄等级（每关英雄等级上限为 5×关卡号）
//   maxMana     最大法力（只能通过统领试炼提升，基础3点、最多10点）
//   cardLevel   卡组中所有卡牌的等级（1~5）
//   equipment   随从装备品级（0 无，1 白，2 绿，3 蓝，4 紫）
//   bondLevel   之前章节在押首领的好感等级（1 结缘 ~ 5 誓约），决定首杀奖励卡能否使用以及加成
//   skillLevel  英雄技能等级（1~3）
//   heroId      英雄（heroes.js），默认罗兰·维克
// 卡组：起始卡组 + 之前章节全部首杀奖励卡（只取费用不超过最大法力的）+ 两把第一关武器，按费用从高到低填满卡组上限。
module.exports = {
  1: { heroLevel: [1, 5], maxMana: [3, 4], cardLevel: [1, 2], equipment: 2, bondLevel: 1, skillLevel: [1, 2] },
  2: { heroLevel: [5, 10], maxMana: [4, 6], cardLevel: [2, 3], equipment: 2, bondLevel: 1, skillLevel: 2 },
  3: { heroLevel: [10, 15], maxMana: [6, 7], cardLevel: [3, 4], equipment: [2, 3], bondLevel: 2, skillLevel: [2, 3] },
  4: { heroLevel: [15, 20], maxMana: [7, 9], cardLevel: [4, 5], equipment: 3, bondLevel: 3, skillLevel: 3 },
  5: { heroLevel: [20, 25], maxMana: [9, 10], cardLevel: 5, equipment: [3, 4], bondLevel: 4, skillLevel: 3 }
};
